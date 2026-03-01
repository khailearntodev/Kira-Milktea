import { CartItem, ProductSize, UserSession } from '../types/index.js';
import { cartService } from './cartService.js';

export class OrderService {
  
  /**
   * helper tiền
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * tạo nội dung hóa đơn
   */
  formatOrderReceipt(session: UserSession): string {
    if (session.cart.length === 0) {
      return "Giỏ hàng của bạn đang trống.";
    }

    let receipt = "📋 *XÁC NHẬN ĐƠN HÀNG*\n\n";
    let totalAmount = 0;

    session.cart.forEach((item, index) => {
      const price = item.size === 'M' ? item.product.price_m : item.product.price_l;
      const subTotal = price * item.quantity;
      totalAmount += subTotal;

      receipt += `${index + 1}. *${item.product.name}* (${item.size})\n`;
      receipt += `   Sl: ${item.quantity} x ${this.formatCurrency(price)} = ${this.formatCurrency(subTotal)}\n`;
    });

    receipt += `\n💰 *TỔNG CỘNG: ${this.formatCurrency(totalAmount)}*`;
    receipt += `\n\n_Vui lòng kiểm tra kỹ trước khi chốt đơn._`;

    return receipt;
  }

  /**
   * gửi nội dung đơn hàng cho chủ quán
   */
  formatOrderToOwner(customerName: string, username: string | undefined, session: UserSession): string {
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const timeString = vietnamTime.toLocaleString('vi-VN', { timeZone: 'UTC' });
    const userLink = username ? `@${username}` : "Không có username";

    let message = `🔔 *CÓ ĐƠN HÀNG MỚI!* 🔔\n`;
    message += `🕒 Thời gian: ${timeString}\n`;
    message += `👤 Khách hàng: ${customerName} (${userLink})\n`;
    message += `--------------------------------\n`;

    let totalAmount = 0;

    session.cart.forEach((item) => {
      const price = item.size === 'M' ? item.product.price_m : item.product.price_l;
      const subTotal = price * item.quantity;
      totalAmount += subTotal;

      message += `- ${item.product.name} (${item.size}) x${item.quantity}\n`;
    });

    message += `--------------------------------\n`;
    message += `💵 *TỔNG TIỀN: ${this.formatCurrency(totalAmount)}*`;
    
    return message;
  }
}

export const orderService = new OrderService();
