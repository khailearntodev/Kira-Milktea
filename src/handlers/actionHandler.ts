import { Context, Markup } from 'telegraf';
import { menuService } from '../services/menuService.js';
import { cartService } from '../services/cartService.js';
import { orderService } from '../services/orderService.js';
import config from '../config/env.js';
import { CartItem, Product, SessionState } from '../types/index.js';

/**
 * xem giỏ hàng hiện tại, chi tiết và nút đặt hàng
 */
export const handleViewCart = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const session = await cartService.getSession(userId);
    const receipt = orderService.formatOrderReceipt(session);

    if (session.cart.length === 0) {
      await ctx.reply(receipt, Markup.inlineKeyboard([
        Markup.button.callback('📜 Xem Thực Đơn', 'BACK_TO_MENU')
      ]));
      return;
    }

    await cartService.updateState(userId, SessionState.CONFIRMING);

    const buttons = [
      [Markup.button.callback('✅ XÁC NHẬN ĐẶT HÀNG', 'CONFIRM_ORDER')],
      [
        Markup.button.callback('✏️ Xóa món', 'EDIT_CART'),
        Markup.button.callback('🗑️ Xóa hết', 'CLEAR_CART')
      ],
      [Markup.button.callback('📜 Đặt thêm món', 'BACK_TO_MENU')]
    ];

    await ctx.reply(receipt, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error viewing cart:', error);
    await ctx.reply('Có lỗi khi xem giỏ hàng.');
  }
};

/**
 * xác nhận đặt hàng: gửi đơn cho chủ quán, xóa cart và cảm ơn khách
 */
export const handleConfirmOrder = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  
  try {
    const session = await cartService.getSession(userId);

    if (session.cart.length === 0) {
      return ctx.reply('Giỏ hàng trống. Vui lòng chọn món trước.');
    }

    const customerName = `${ctx.from.first_name} ${ctx.from.last_name || ''}`.trim();
    const orderMessage = orderService.formatOrderToOwner(customerName, ctx.from.username, session);

    if (config.ownerId) {
      try {
        await ctx.telegram.sendMessage(config.ownerId, orderMessage, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Failed to send message to owner:', err);
      }
    } else {
      console.warn('OWNER_ID not set, order notification skipped.');
    }

    await cartService.clearCart(userId);

    await ctx.reply(
      `🎉 *ĐẶT HÀNG THÀNH CÔNG!*\n\nCảm ơn ${customerName} đã ủng hộ Kira Milktea.\nChúng mình đang làm món và sẽ giao ngay cho bạn nhé! ❤️`,
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('📜 Đặt đơn mới', 'BACK_TO_MENU')
        ]) 
      }
    );

  } catch (error) {
    console.error('Error confirming order:', error);
    await ctx.reply('Có lỗi xảy ra khi chốt đơn. Vui lòng thử lại.');
  }
};

/**
 * xử lý khi user chọn option "Xóa món" trong giỏ hàng: hiện danh sách món để xóa từng món hoặc xóa hết
 */
export const handleEditCart = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const session = await cartService.getSession(userId);
    if (session.cart.length === 0) return ctx.reply('Giỏ hàng trống.');

    const buttons = session.cart.map((item, index) => [
      Markup.button.callback(
        `❌ Xóa: ${item.product.name} (${item.size})`, 
        `REMOVE_ITEM_${index}`
      )
    ]);
    
    buttons.push([Markup.button.callback('⬅️ Quay lại Giỏ hàng', 'VIEW_CART')]);

    await ctx.editMessageText(
      'Chọn món bạn muốn xóa khỏi giỏ hàng:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error('Error editing cart:', error);
  }
};

/**
 * xử lý xóa món
 */
export const handleRemoveItem = async (ctx: Context) => {
  if (!ctx.callbackQuery || !ctx.from || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = (ctx.callbackQuery as any).data;
  const index = parseInt(callbackData.replace('REMOVE_ITEM_', ''));
  const userId = ctx.from.id;

  try {
    await cartService.removeFromCart(userId, index);
    await ctx.answerCbQuery('Đã xóa món!');

    await handleViewCart(ctx);
  } catch (error) {
    console.error('Error removing item:', error);
  }
};

/**
 * xóa hết cart khi user chọn "Xóa hết" trong giỏ hàng
 */
export const handleClearCartAction = async (ctx: Context) => {
  if (!ctx.from) return;
  try {
    await cartService.clearCart(ctx.from.id);
    await ctx.answerCbQuery('Đã xóa sạch giỏ hàng!');
    await handleBackToMenu(ctx);
  } catch (error) {
    console.error('Error clearing cart action:', error);
  }
};

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
