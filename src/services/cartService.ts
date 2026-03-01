import * as redis from '../utils/redis.js';
import { CartItem, Product, ProductSize, SessionState, UserSession } from '../types/index.js';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 3600;

export class CartService {

  private getSessionKey(userId: string | number): string {
    return `${SESSION_PREFIX}${userId}`;
  }

  /**
   * lấy trạng thái session, chưa có thì tạo mới
   */
  async getSession(userId: string | number): Promise<UserSession> {
    const key = this.getSessionKey(userId);
    const session = await redis.get<UserSession>(key);
    
    if (session) {
      return session;
    }

    return {
      state: SessionState.BROWSING,
      cart: []
    };
  }

  /**
   * lưu session vào redis (ttl 1 giờ)
   */
  async saveSession(userId: string | number, session: UserSession): Promise<void> {
    const key = this.getSessionKey(userId);
    await redis.set(key, session, SESSION_TTL);
  }

  /**
    * thêm sản phẩm vào giỏ hàng, chặn spam (tối đa 50 ly) và gộp sản phẩm giống nhau (cùng id và size) vào 1 dòng
   */
  async addToCart(userId: string | number, item: CartItem): Promise<UserSession> {
    const session = await this.getSession(userId);
    
    const currentTotalQuantity = session.cart.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
    
    //chặn spam
    if (currentTotalQuantity + item.quantity > 50) {
      throw new Error('Giỏ hàng đã đầy (tối đa 50 ly). Vui lòng chốt đơn hoặc xóa bớt.');
    }

    const existingItemIndex = session.cart.findIndex(
      (cartItem) => 
        cartItem.product.item_id === item.product.item_id && 
        cartItem.size === item.size
    );

    if (existingItemIndex > -1) {
      session.cart[existingItemIndex].quantity += item.quantity;
    } else {
        session.cart.push(item);
    }
    
    session.tempSelection = undefined;
    session.state = SessionState.BROWSING; 

    await this.saveSession(userId, session);
    return session;
  }

  /**
   * xóa khỏi cart
   */
  async removeFromCart(userId: string | number, index: number): Promise<UserSession> {
    const session = await this.getSession(userId);
    
    if (index >= 0 && index < session.cart.length) {
      session.cart.splice(index, 1);
      await this.saveSession(userId, session);
    }
    
    return session;
  }

  /**
   * xóa cart
   */
  async clearCart(userId: string | number): Promise<void> {
    const session = await this.getSession(userId);
    session.cart = [];
    session.state = SessionState.BROWSING;
    session.tempSelection = undefined;
    await this.saveSession(userId, session);
  }

  /**
   * tính tổng cart
   */
  calculateTotal(cart: CartItem[]): number {
    return cart.reduce((total, item) => {
      const price = item.size === 'M' ? item.product.price_m : item.product.price_l;
      return total + (price * item.quantity);
    }, 0);
  }

  /**
   * cập nhật trangh thái session
   */
  async updateState(userId: string | number, state: SessionState): Promise<void> {
    const session = await this.getSession(userId);
    session.state = state;
    await this.saveSession(userId, session);
  }

  /**
   * thiết lập lựa chọn tạm thời (sản phẩm & size) trước khi hỏi số lượng
   */
  async setTempSelection(userId: string | number, productId: string, size: ProductSize): Promise<void> {
    const session = await this.getSession(userId);
    session.tempSelection = { productId, size };
    session.state = SessionState.SELECTING_QUANTITY;
    await this.saveSession(userId, session);
  }
}

export const cartService = new CartService();
