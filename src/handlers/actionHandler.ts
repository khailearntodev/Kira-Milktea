import { Context, Markup } from 'telegraf';
import { menuService } from '../services/menuService.js';
import { cartService } from '../services/cartService.js';
import { CartItem, Product, SessionState } from '../types/index.js';

/**
 * xử lý khi user chọn 1 category, vd: "Trà Sữa" -> show category đó
 */
export const handleCategorySelection = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = (ctx.callbackQuery as any).data; 
  const category = callbackData.replace('CATEGORY_', '');
    
  try {
    const allProducts = await menuService.loadMenu();
    const productsInCategory = allProducts.filter(p => p.category === category);
    
    if (productsInCategory.length === 0) {
      return ctx.reply('Danh mục này hiện không có món nào/đã hết hàng.');
    }

    const buttons = productsInCategory.map(p => [
      Markup.button.callback(`${p.name} - ${p.price_m/1000}k`, `PRODUCT_${p.item_id}`)
    ]);
    
    buttons.push([Markup.button.callback('⬅️ Quay lại Menu', 'BACK_TO_MENU')]);

    await ctx.editMessageText(
      `Danh sách món trong nhóm *${category}*:`, 
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    console.error('Error handling category:', error);
    await ctx.reply('Có lỗi xảy ra khi tải danh sách món.');
  }
};

/**
 * xử lý khi user chọn 1 sản phẩm, vd: "Trà Sữa Trân Châu" -> show chi tiết sản phẩm và hỏi size
 */
export const handleProductSelection = async (ctx: Context) => {
  if (!ctx.callbackQuery) return;
  const callbackData = (ctx.callbackQuery as any).data;
  const productId = callbackData.replace('PRODUCT_', '');

  try {
    const product = await menuService.getProductById(productId);
    
    if (!product) {
      return ctx.reply('Sản phẩm không tồn tại hoặc đã bị xóa.');
    }

    const message = `Bạn đã chọn: *${product.name}*\n\n` +
                    `📝 Mô tả: ${product.description}\n` +
                    `Vui lòng chọn Size:`;
    
    const buttons = [
      [
        Markup.button.callback(`Size M (${product.price_m.toLocaleString()}đ)`, `SELECT_SIZE_${productId}_M`),
        Markup.button.callback(`Size L (${product.price_l.toLocaleString()}đ)`, `SELECT_SIZE_${productId}_L`)
      ],
      [Markup.button.callback('⬅️ Quay lại', `CATEGORY_${product.category}`)]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error selecting product:', error);
    await ctx.reply('Có lỗi khi chọn món.');
  }
};

/**
 * xử lý khi user chọn size sau khi đã chọn sản phẩm, vd: "Size M" -> hỏi số lượng
 */
export const handleSizeSelection = async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery) return;
  
  const callbackData = (ctx.callbackQuery as any).data;
  const parts = callbackData.split('_');
  const productId = parts[2];
  const size = parts[3] as 'M' | 'L';

  try {
    const product = await menuService.getProductById(productId);
    
    if (!product) {
      return ctx.reply('Sản phẩm không hợp lệ.');
    }

    await cartService.setTempSelection(ctx.from.id, productId, size);

    await ctx.reply(
      `Bạn chọn *${product.name}* (Size ${size}).\n\n` +
      `🔢 Vui lòng nhập số lượng (VD: 1, 2, 5...):`,
      { parse_mode: 'Markdown' }
    );
    
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error selecting size:', error);
    await ctx.reply('Có lỗi khi chọn size.');
  }
};

/**
 * xử lý khi user nhấn "Quay lại Menu"
 */
export const handleBackToMenu = async (ctx: Context) => {
  try {
    const products = await menuService.loadMenu();
    const categories = Array.from(new Set(products.map(p => p.category)));
    const buttons = categories.map(cat => [Markup.button.callback(cat, `CATEGORY_${cat}`)]);
    buttons.push([Markup.button.callback('🛒 Xem Giỏ Hàng', 'VIEW_CART')]);

    await ctx.editMessageText('Mời bạn chọn danh mục đồ uống:', Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error going back to menu:', error);
  }
};
