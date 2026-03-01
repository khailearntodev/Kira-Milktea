import { Context, Markup } from 'telegraf';
import { menuService } from '../services/menuService.js';
import { cartService } from '../services/cartService.js';
import { orderService } from '../services/orderService.js';
import config from '../config/env.js';
import { SessionState } from '../types/index.js';

export const handleBackToMenu = async (ctx: Context) => {
  try {
    const products = await menuService.loadMenu();
    const categories = Array.from(new Set(products.map(p => p.category)));
    
    const buttons = categories.map(cat => [Markup.button.callback(cat, 'CATEGORY_' + cat)]);
    
    buttons.push([Markup.button.callback('🛒 Xem Giỏ Hàng', 'VIEW_CART')]);

    try {
        await ctx.editMessageText('Mời bạn chọn danh mục đồ uống:', Markup.inlineKeyboard(buttons));
    } catch {
        await ctx.reply('Mời bạn chọn danh mục đồ uống:', Markup.inlineKeyboard(buttons));
    }
  } catch (error) {
    console.error('Error going back to menu:', error);
  }
};

export const handleCategorySelection = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = (ctx.callbackQuery as any).data; 
  const category = callbackData.replace('CATEGORY_', '');
    
  try {
    const allProducts = await menuService.loadMenu(true);
    const productsInCategory = allProducts.filter(p => p.category === category && p.available);
    
    if (productsInCategory.length === 0) {
      await ctx.answerCbQuery('Danh mục này hiện không có món nào hoặc đã hết hàng.');
      return;
    }

    const buttons = productsInCategory.map(p => [
      Markup.button.callback(p.name + ' - ' + p.price_m.toLocaleString('vi-VN') + 'đ', 'PRODUCT_' + p.item_id)
    ]);
    buttons.push([Markup.button.callback('🔙 Quay lại Menu', 'BACK_TO_MENU')]);

    await ctx.editMessageText(
      'Danh sách món trong nhóm *' + category + '*: \n(Chọn món để xem chi tiết)', 
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

export const handleProductSelection = async (ctx: Context) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const callbackData = (ctx.callbackQuery as any).data;
  const productId = callbackData.replace('PRODUCT_', '');

  try {
    const product = await menuService.getProductById(productId);
    if (!product) {
       await ctx.answerCbQuery('Sản phẩm không tồn tại hoặc đã bị xóa.');
       return;
    }

    const message = 'Bạn đã chọn: *' + product.name + '*\n\n📝 Mô tả: ' + (product.description || 'Không có mô tả') + '\n\nVui lòng chọn Size:';
    
    const buttons = [
      [
        Markup.button.callback('Size M (' + product.price_m.toLocaleString('vi-VN') + 'đ)', 'SELECT_SIZE_' + productId + '_M'),
        Markup.button.callback('Size L (' + product.price_l.toLocaleString('vi-VN') + 'đ)', 'SELECT_SIZE_' + productId + '_L')
      ],
      [Markup.button.callback('🔙 Quay lại', 'CATEGORY_' + product.category)]
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('Error selecting product:', error);
    await ctx.answerCbQuery('Lỗi khi chọn sản phẩm');
  }
};

export const handleSizeSelection = async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = (ctx.callbackQuery as any).data;
  const prefix = 'SELECT_SIZE_'; 
  const dataWithoutPrefix = callbackData.substring(prefix.length);
  const lastUnderscoreIndex = dataWithoutPrefix.lastIndexOf('_');
  
  const productId = dataWithoutPrefix.substring(0, lastUnderscoreIndex);
  const size = dataWithoutPrefix.substring(lastUnderscoreIndex + 1) as 'M' | 'L';

  try {
    const product = await menuService.getProductById(productId);
    if (!product) {
        await ctx.answerCbQuery('Sản phẩm không hợp lệ.');
        return;
    }

    await cartService.setTempSelection(ctx.from.id, productId, size);

    await ctx.reply(
      'Bạn chọn *' + product.name + '* (Size ' + size + ').\n\n🔢 Vui lòng nhập số lượng (VD: 1, 2, 5...):',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error selecting size:', error);
    await ctx.answerCbQuery('Lỗi chọn size');
  }
};


export const handleViewCart = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const session = await cartService.getSession(userId);
    const receipt = orderService.formatOrderReceipt(session);

    if (session.cart.length === 0) {
        const buttons = [[Markup.button.callback('📜 Xem Thực Đơn', 'BACK_TO_MENU')]];
        try {
             if (ctx.callbackQuery) {
                await ctx.editMessageText(receipt, Markup.inlineKeyboard(buttons));
             } else {
                await ctx.reply(receipt, Markup.inlineKeyboard(buttons));
             }
        } catch {
             await ctx.reply(receipt, Markup.inlineKeyboard(buttons));
        }
        return;
    }

    await cartService.updateState(userId, SessionState.CONFIRMING);

    const buttons = [
      [Markup.button.callback('✅ XÁC NHẬN ĐẶT HÀNG', 'CONFIRM_ORDER')],
      [
        Markup.button.callback('✏️ Xóa món', 'EDIT_CART'),
        Markup.button.callback('🗑️ Xóa hết', 'CLEAR_CART')
      ],
      [Markup.button.callback('➕ Đặt thêm món', 'BACK_TO_MENU')]
    ];

    if (ctx.callbackQuery) {
        await ctx.editMessageText(receipt, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });
    } else {
        await ctx.reply(receipt, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });
    }

  } catch (error) {
    console.error('Error viewing cart:', error);
    await ctx.reply('Có lỗi khi xem giỏ hàng.');
  }
};

export const handleEditCart = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const session = await cartService.getSession(userId);
    if (session.cart.length === 0) {
        await ctx.answerCbQuery('Giỏ hàng trống.');
        return handleViewCart(ctx);
    }

    const buttons = session.cart.map((item, index) => [
      Markup.button.callback(
        '❌ Xóa: ' + item.product.name + ' (' + item.size + ')', 
        'REMOVE_ITEM_' + index
      )
    ]);
    buttons.push([Markup.button.callback('🔙 Quay lại Giỏ hàng', 'VIEW_CART')]);

    await ctx.editMessageText('Chọn món bạn muốn xóa khỏi giỏ hàng:', Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error editing cart:', error);
    await ctx.answerCbQuery('Lỗi hiển thị xoá món');
  }
};

export const handleRemoveItem = async (ctx: Context) => {
  if (!ctx.callbackQuery || !ctx.from || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = (ctx.callbackQuery as any).data;
  const index = parseInt(callbackData.replace('REMOVE_ITEM_', ''));
  const userId = ctx.from.id;

  try {
    const session = await cartService.removeFromCart(userId, index);
    
    if (session.cart.length === 0) {
        await ctx.answerCbQuery('Đã xóa món! Giỏ hàng trống.');
        await handleViewCart(ctx);
    } else {
        await ctx.answerCbQuery('Đã xóa món!');
        
        const buttons = session.cart.map((item, idx) => [
            Markup.button.callback(
                '❌ Xóa: ' + item.product.name + ' (' + item.size + ')', 
                'REMOVE_ITEM_' + idx
            )
        ]);
        buttons.push([Markup.button.callback('🔙 Quay lại Giỏ hàng', 'VIEW_CART')]);
        
        await ctx.editMessageText('Chọn món bạn muốn xóa khỏi giỏ hàng:', Markup.inlineKeyboard(buttons));
    }
  } catch (error) {
    console.error('Error removing item:', error);
    await ctx.answerCbQuery('Lỗi khi xoá món: ' + (error as Error).message);
  }
};

export const handleClearCartAction = async (ctx: Context) => {
  if (!ctx.from) return;
  try {
    await cartService.clearCart(ctx.from.id);
    await ctx.answerCbQuery('Đã xóa sạch giỏ hàng!');
    await handleBackToMenu(ctx);
  } catch (error) {
    console.error('Error clearing cart action:', error);
    await ctx.answerCbQuery('Lỗi xoá giỏ hàng');
  }
};

export const handleConfirmOrder = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  
  try {
    const session = await cartService.getSession(userId);
    if (session.cart.length === 0) {
        await ctx.answerCbQuery('Giỏ hàng trống.');
        return;
    }

    // 1. Notify Owner
    const customerName = (ctx.from.first_name + ' ' + (ctx.from.last_name || '')).trim();
    const orderMessage = orderService.formatOrderToOwner(customerName, ctx.from.username, session);

    if (config.ownerId) {
      try {
        await ctx.telegram.sendMessage(config.ownerId, orderMessage, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Failed to send message to owner:', err);
      }
    }

    // 2. Clear Cart
    await cartService.clearCart(userId);

    // 3. Thank User
    await ctx.editMessageText(
      '🎉 *ĐẶT HÀNG THÀNH CÔNG!*\n\nCảm ơn ' + customerName + ' đã ủng hộ Kira Milktea.\nChúng mình đang làm món và sẽ giao ngay cho bạn nhé! 🥰',
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([Markup.button.callback('📜 Đặt đơn mới', 'BACK_TO_MENU')]) 
      }
    );
  } catch (error) {
    console.error('Error confirming order:', error);
    await ctx.reply('Có lỗi khi chốt đơn.');
  }
};
