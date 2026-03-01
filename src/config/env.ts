import dotenv from 'dotenv';

dotenv.config();

interface Config {
  botToken: string;
  redisUrl: string;
  ownerId: string;
  openHour: string;
  closeHour: string;
  nodeEnv: string;
}

const config: Config = {
  botToken: process.env.BOT_TOKEN || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379', 
  ownerId: process.env.OWNER_ID || '',
  openHour: process.env.OPEN_HOUR || '7:00',
  closeHour: process.env.CLOSE_HOUR || '22:00',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.botToken) {
  console.warn("Missing BOT_TOKEN in environment variables");
}
if (!config.ownerId) {
  console.warn("Missing OWNER_ID in environment variables");
}

export default config;
