import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import * as redis from '../utils/redis.js';
import { Product } from '../types/index.js';

class MenuService {
  private menuCache: Product[] | null = null;
  private readonly csvPath = path.join(process.cwd(), 'src', 'data', 'Menu.csv');
  private readonly UNAVAILABLE_KEY = 'unavailable_products';

  /**
   * Load menu and augment with availability from Redis
   */
  async loadMenu(forceReload = false): Promise<Product[]> {
    // 1. Load base menu from CSV (Cached)
    if (!this.menuCache || forceReload) {
        await this.loadCsvMenu();
    }

    if (!this.menuCache) return [];

    // 2. Load unavailable items from Redis (always fresh)
    const unavailableItems = await redis.sMembers(this.UNAVAILABLE_KEY);
    const unavailableSet = new Set(unavailableItems);

    // 3. Update availability status based on Redis
    return this.menuCache.map(product => ({
        ...product,
        // Item is available if CSV says so AND it's not blacklisted in Redis
        available: product.available && !unavailableSet.has(product.item_id)
    }));
  }

  /* Internal method to load CSV strictly */
  private async loadCsvMenu(): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: Product[] = [];
      
      if (!fs.existsSync(this.csvPath)) {
          console.error('CSV File not found at:', this.csvPath);
          this.menuCache = [];
          return resolve();
      }

      fs.createReadStream(this.csvPath)
        .pipe(csv())
        .on('data', (data: any) => {
          if (!data.item_id) return; 

          const product: Product = {
            category: data.category,
            item_id: data.item_id,
            name: data.name,
            description: data.description,
            price_m: parseInt(data.price_m),
            price_l: parseInt(data.price_l),
            // Default availability from CSV
            available: (data.available || '').trim().toLowerCase() === 'true'
          };
          
          results.push(product);
        })
        .on('end', () => {
          this.menuCache = results;
          console.log(`Menu CSV loaded: ${results.length} items`);
          resolve();
        })
        .on('error', (error) => {
          console.error('Error loading menu CSV:', error);
          reject(error);
        });
    });
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const products = await this.loadMenu();
    return products.find(p => p.item_id === id);
  }

  async refreshMenu(): Promise<Product[]> {
    return this.loadMenu(true);
  }

  async markOutOfStock(productId: string): Promise<boolean> {
     // Verify product exists
     if (!this.menuCache) await this.loadCsvMenu();
     const exists = this.menuCache?.some(p => p.item_id === productId);
     if (!exists) return false;

     await redis.sAdd(this.UNAVAILABLE_KEY, productId);
     return true;
  }

  async markInStock(productId: string): Promise<boolean> {
     await redis.sRem(this.UNAVAILABLE_KEY, productId);
     return true;
  }
}

export const menuService = new MenuService();
