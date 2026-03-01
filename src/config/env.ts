import dotenv from 'dotenv';

dotenv.config();

interface Config {
  botToken: string;
  nodeEnv: string;
}

const config: Config = {
  botToken: process.env.BOT_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.botToken) {
  console.warn("Missing BOT_TOKEN in environment variables");
}

export default config;
