const redis = require('redis');
const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisOptions = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('Too many retries on Redis. Connection terminated');
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB) || 0
      };

      // Remove password if not provided to avoid auth issues
      if (!process.env.REDIS_PASSWORD) {
        delete redisOptions.password;
      }

      this.client = createClient(redisOptions);

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔴 Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('❌ Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      // Don't throw error - allow app to run without Redis
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    if (!this.isConnected || !this.client) return false;
    try {
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flushPattern(pattern) {
    if (!this.isConnected || !this.client) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis FLUSH PATTERN error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Connect to Redis
const connectRedis = async () => {
  return await redisClient.connect();
};

module.exports = {
  redisClient,
  connectRedis
};