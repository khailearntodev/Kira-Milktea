export interface Product {
  item_id: string;
  name: string;
  description: string;
  price_m: number;
  price_l: number;
  category: string;
  available: boolean;
}

export type ProductSize = 'M' | 'L';

export interface CartItem {
  product: Product;
  quantity: number;
  size: ProductSize;
}

export enum SessionState {
  BROWSING = 'BROWSING',         
  SELECTING_QUANTITY = 'SELECTING_QUANTITY', 
  CONFIRMING = 'CONFIRMING'    
}

export interface UserSession {
  state: SessionState;
  cart: CartItem[];
  tempSelection?: { 
    productId: string; 
    size: ProductSize; 
  };
}
