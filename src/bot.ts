import { Telegraf } from 'telegraf';
import config from './config/env.js';

const bot = new Telegraf(config.botToken);

bot.start((ctx) => ctx.reply('Bot đã sẵn sàng nhận đơn trà sữa!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch();