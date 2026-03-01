import { Context, Markup } from 'telegraf';
import config from '../config/env.js';
import { menuService } from '../services/menuService.js';
import { cartService } from '../services/cartService.js';
import { Product } from '../types/index.js';

// check giờ làm việc
const isWithinOperatingHours = (): boolean => {
  const now = new Date();
  
  const [openHour, openMinute] = config.openHour.split(':').map(Number);
  const [closeHour, closeMinute] = config.closeHour.split(':').map(Number);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const currentTimeVal = currentHour * 60 + currentMinute;
  const openTimeVal = openHour * 60 + openMinute;
  const closeTimeVal = closeHour * 60 + closeMinute;
  
  return currentTimeVal >= openTimeVal && currentTimeVal < closeTimeVal;
};

export const handleStart = async (ctx: Context) => {
  if (!isWithinOperatingHours()) {
    return ctx.reply(
      `Xin lỗi, quán hiện đang đóng cửa 😔\nGiờ mở cửa: ${config.openHour} - ${config.closeHour}.\nHẹn gặp lại bạn vào ngày mai nhé!`
    );
  }

  const welcomeMsg = `Chào mừng bạn đến với Kira Milktea! 🧋\nTôi là trợ lý ảo giúp bạn đặt món nhanh chóng.\n\nHãy nhấn vào nút bên dưới để xem Menu hoặc gõ /help để được hướng dẫn.`;
  
  await ctx.reply(welcomeMsg, Markup.inlineKeyboard([
    Markup.button.callback('📜 Xem Thực Đơn', 'VIEW_MENU'),
    Markup.button.callback('🛒 Xem Giỏ Hàng', 'VIEW_CART')
  ]));
};

export const handleMenu = async (ctx: Context) => {
  if (!isWithinOperatingHours()) {
    return ctx.reply(`Xin lỗi, quán hiện đang đóng cửa (Giờ mở cửa: ${config.openHour} - ${config.closeHour})`);
  }

  try {
    const products = await menuService.loadMenu();
    const categories = Array.from(new Set(products.filter((p: Product) => p.available).map((p: Product) => p.category)));
    
    if (categories.length === 0) {
      await ctx.reply('Hiện tại quán đang tạm hết món hoặc chưa có menu. Vui lòng quay lại sau!');
      return;
    }

    const buttons = categories.map(cat => [Markup.button.callback(cat, `CATEGORY_${cat}`)]);
    buttons.push([Markup.button.callback('🛒 Xem Giỏ Hàng', 'VIEW_CART')]);

    await ctx.reply('Mời bạn chọn danh mục đồ uống:', Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error fetching menu:', error);
    await ctx.reply('Xin lỗi, hiện tại không thể tải menu. Vui lòng thử lại sau.');
  }
};

export const handleClear = async (ctx: Context) => {
  if (!ctx.from) return;
  
  try {
    await cartService.clearCart(ctx.from.id);
    await ctx.reply('Đã xóa giỏ hàng và hủy đơn hàng hiện tại. Bạn có thể bắt đầu lại bằng lệnh /start hoặc /menu.');
  } catch (error) {
    console.error('Error clearing cart:', error);
    await ctx.reply('Có lỗi xảy ra khi xóa giỏ hàng.');
  }
};

export const handleOutOfStock = async (ctx: Context) => {
  // Only owner can use this
  if (String(ctx.from?.id) !== config.ownerId) return;

  // Expected format: /hethang ITEM_ID
  if (!ctx.message || !('text' in ctx.message) || !ctx.message.text.startsWith('/hethang')) return;
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ Vui lòng nhập mã món. Ví dụ: /hethang TS01');
  }

  const itemId = args[1].trim();
  const success = await menuService.markOutOfStock(itemId);
  
  if (success) {
    await ctx.reply(`✅ Đã đánh dấu món ${itemId} là HẾT HÀNG.`);
  } else {
    await ctx.reply(`⚠️ Không tìm thấy món có mã ${itemId}.`);
  }
};

export const handleInStock = async (ctx: Context) => {
  // Only owner can use this
  if (String(ctx.from?.id) !== config.ownerId) return;

  // Expected format: /conhang ITEM_ID
  if (!ctx.message || !('text' in ctx.message) || !ctx.message.text.startsWith('/conhang')) return;
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ Vui lòng nhập mã món. Ví dụ: /conhang TS01');
  }

  const itemId = args[1].trim();
  await menuService.markInStock(itemId);
  await ctx.reply(`✅ Đã đánh dấu món ${itemId} ĐANG BÁN trở lại.`);
};

