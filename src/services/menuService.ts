import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Product } from '../types/index.js';

class MenuService {
  private menuCache: Product[] | null = null;
  private readonly csvPath = path.join(process.cwd(), 'src', 'data', 'Menu.csv');

  async loadMenu(forceReload = false): Promise<Product[]> {
    if (this.menuCache && !forceReload) {
      return this.menuCache;
    }

    if (forceReload) {
        this.menuCache = null;
    }

    return new Promise((resolve, reject) => {
      const results: Product[] = [];

      if (!fs.existsSync(this.csvPath)) {
          console.error('CSV File not found at:', this.csvPath);
          return resolve([]);
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
            available: (data.available || '').trim().toLowerCase() === 'true'
          };
          
          results.push(product);
        })
        .on('end', () => {
          this.menuCache = results;
          console.log(`Menu loaded: ${results.length} items from ${this.csvPath}`);
          resolve(results);
        })
        .on('error', (error) => {
          console.error('Error loading menu:', error);
          reject(error);
        });
    });
  }

  /**
   * get sản phẩm theo id
   */
  async getProductById(id: string): Promise<Product | undefined> {
    const menu = await this.loadMenu();
    return menu.find(p => p.item_id === id);
  }

  /**
   * refresh cache
   */
  async refreshMenu(): Promise<Product[]> {
    this.menuCache = null;
    return this.loadMenu();
  }
}

export const menuService = new MenuService();
