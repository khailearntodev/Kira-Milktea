import { createClient } from 'redis';
import config from '../config/env.js';

const client = createClient({
  url: config.redisUrl
});

client.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await client.connect();
        console.log('Connected to Redis');
    } catch (e) {
        console.error('Could not connect to Redis', e);
    }
})();

export const set = async (key: string, value: any, expireSeconds?: number): Promise<void> => {
  try {
    const stringValue = JSON.stringify(value);
    if (expireSeconds) {
      await client.set(key, stringValue, { EX: expireSeconds });
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error(`Error setting key ${key}:`, error);
    throw error;
  }
};

export const get = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error getting key ${key}:`, error);
    return null;
  }
};

export const del = async (key: string): Promise<void> => {
  try {
    await client.del(key);
  } catch (error) {
    console.error(`Error deleting key ${key}:`, error);
    throw error;
  }
};

export default client;
