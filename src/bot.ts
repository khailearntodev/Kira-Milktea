import { Telegraf } from 'telegraf';
import http from 'http'; 
import config from './config/env.js';
import * as commandHandler from './handlers/commandHandler.js';
import * as actionHandler from './handlers/actionHandler.js';
import * as messageHandler from './handlers/messageHandler.js';
import { menuService } from './services/menuService.js';

const bot = new Telegraf(config.botToken);

// === GLOBAL ERROR HANDLING ===
bot.catch((err: any, ctx) => {
  console.error('Ooops, encountered an error for ' + ctx.updateType, err);
  ctx.reply('Có lỗi xảy ra, vui lòng thử lại sau.').catch(e => console.error('Failed to reply error', e));
});

// === COMMAND HANDLERS ===
bot.command('start', commandHandler.handleStart);
bot.command('menu', commandHandler.handleMenu);
bot.command('clear', commandHandler.handleClear);
bot.command('help', commandHandler.handleStart); 

// === ACTION HANDLERS (Callback Queries) ===
bot.action('VIEW_MENU', commandHandler.handleMenu);
bot.action('BACK_TO_MENU', actionHandler.handleBackToMenu);
bot.action('VIEW_CART', actionHandler.handleViewCart);
bot.action('CONFIRM_ORDER', actionHandler.handleConfirmOrder);
bot.action('EDIT_CART', actionHandler.handleEditCart);
bot.action('CLEAR_CART', actionHandler.handleClearCartAction);

bot.action(/^REMOVE_ITEM_\d+$/, actionHandler.handleRemoveItem);

bot.action(/^SELECT_SIZE_.+$/, actionHandler.handleSizeSelection);

bot.action(/^PRODUCT_.+$/, actionHandler.handleProductSelection);

bot.action(/^CATEGORY_.+$/, actionHandler.handleCategorySelection);


bot.on('text', messageHandler.handleMessage);

// === STARTUP ===
menuService.loadMenu()
  .then(() => console.log('? Menu loaded successfully'))
  .catch(err => console.error('? Failed to load menu on startup:', err));

bot.launch().then(() => {
  console.log('?? Bot is running in ' + config.nodeEnv + ' mode!');
  console.log('?? Operating Hours: ' + config.openHour + ' - ' + config.closeHour);
});

// === GRACEFUL SHUTDOWN ===
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

if (config.nodeEnv === 'production') {
  const PORT = process.env.PORT || 3000;
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Kira Milktea Bot is alive!');
    res.end();
  }).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}
