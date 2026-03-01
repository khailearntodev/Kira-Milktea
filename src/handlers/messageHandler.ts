import { Context, Markup } from 'telegraf';
import { cartService } from '../services/cartService.js';
import { menuService } from '../services/menuService.js';
import { SessionState } from '../types/index.js';

export const handleMessage = async (ctx: Context) => {
  if (!ctx.from || !ctx.message) return;

  const userId = ctx.from.id;
  const session = await cartService.getSession(userId);

  if (session.state === SessionState.SELECTING_QUANTITY) {
    
    if (!('text' in ctx.message)) {
      return ctx.reply('⚠️ Vui lòng chỉ nhập số lượng (VD: 1, 2). Không gửi ảnh, sticker hay file nhé!');
    }

    const textInput = ctx.message.text.trim();
    const quantity = parseInt(textInput);

    if (isNaN(quantity) || quantity <= 0) {
      return ctx.reply('⚠️ Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0 (VD: 1, 2, 5...).');
    }

    if (!session.tempSelection) {
      await cartService.updateState(userId, SessionState.BROWSING);
      return ctx.reply('Có lỗi xảy ra, vui lòng chọn lại món từ đầu.', 
        Markup.inlineKeyboard([Markup.button.callback('📜 Xem Thực Đơn', 'VIEW_MENU')])
      );
    }

    try {
      const product = await menuService.getProductById(session.tempSelection.productId);
      
      if (!product) {
        return ctx.reply('Sản phẩm không tồn tại.');
      }

      await cartService.addToCart(userId, {
        product: product,
        quantity: quantity,
        size: session.tempSelection.size
      });

      const message = `✅ Đã thêm *${product.name}* (Size ${session.tempSelection.size}, x${quantity}) vào giỏ hàng!`;
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📜 Đặt món tiếp', `CATEGORY_${product.category}`)],
          [Markup.button.callback('🛒 Xem Giỏ Hàng & Thanh Toán', 'VIEW_CART')]
        ])
      });

    } catch (error: any) {
      console.error('Error adding to cart:', error);
      await ctx.reply(`❌ ${error.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng.'}`);
    }
    return;
  }

  // níu user nhắn bậy vào ô nhập liệu lúc ko cần nhập nữa
  if ('text' in ctx.message && !ctx.message.text.startsWith('/')) {
     await ctx.reply('Mình chưa hiểu ý bạn lắm. Nhấn /menu để xem thực đơn nhé!');
  }
};
