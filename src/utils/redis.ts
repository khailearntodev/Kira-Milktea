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

// Set Operations
export const sAdd = async (key: string, value: string): Promise<void> => {
  try {
    await client.sAdd(key, value);
  } catch (error) {
    console.error(`Error adding to set ${key}:`, error);
    throw error;
  }
};

export const sRem = async (key: string, value: string): Promise<void> => {
  try {
    await client.sRem(key, value);
  } catch (error) {
    console.error(`Error removing from set ${key}:`, error);
    throw error;
  }
};

export const sIsMember = async (key: string, value: string): Promise<boolean> => {
  try {
    const result = await client.sIsMember(key, value);
    return Boolean(result);
  } catch (error) {
    console.error(`Error checking set member ${key}:`, error);
    return false;
  }
};

export const sMembers = async (key: string): Promise<string[]> => {
  try {
    return await client.sMembers(key);
  } catch (error) {
    console.error(`Error getting set members ${key}:`, error);
    return [];
  }
};

export default client;
