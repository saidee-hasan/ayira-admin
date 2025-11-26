const NodeCache = require('node-cache');
const redis = require('redis');
const logger = require('../utils/logger');

// Memory cache for frequently accessed data (fast)
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Cleanup every minute
  useClones: false,
  maxKeys: 5000
});

// Redis client for distributed caching
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Too many retries on Redis. Connection terminated');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

// Handle Redis connection events
redisClient.on('connect', () => logger.info('🔄 Redis connecting...'));
redisClient.on('ready', () => logger.info('✅ Redis connected successfully'));
redisClient.on('error', (err) => logger.error('❌ Redis error:', err));
redisClient.on('end', () => logger.info('🔴 Redis disconnected'));
redisClient.on('reconnecting', () => logger.info('🔄 Redis reconnecting'));

// Enhanced cache middleware with Redis + Memory cache
const cacheMiddleware = (duration = 300, useRedis = true) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      // Try memory cache first (fastest)
      const memoryCached = memoryCache.get(key);
      if (memoryCached) {
        logger.debug(`Memory cache hit: ${key}`);
        return res.json(memoryCached);
      }

      // Try Redis cache
      if (useRedis && redisClient.isOpen) {
        const redisCached = await redisClient.get(key);
        if (redisCached) {
          const data = JSON.parse(redisCached);
          logger.debug(`Redis cache hit: ${key}`);
          
          // Store in memory cache for faster subsequent access
          memoryCache.set(key, data, 60); // 1 minute in memory
          
          return res.json(data);
        }
      }

      // Cache miss - proceed with request
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Store in memory cache
          memoryCache.set(key, data, Math.min(duration, 300)); // Max 5min in memory
          
          // Store in Redis if enabled
          if (useRedis && redisClient.isOpen) {
            redisClient.setEx(key, duration, JSON.stringify(data))
              .catch(err => logger.error('Redis set error:', err));
          }
          
          logger.debug(`Cache set: ${key}, TTL: ${duration}s`);
        }
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
  try {
    // Clear memory cache
    const memoryKeys = memoryCache.keys();
    const keysToDelete = memoryKeys.filter(key => key.includes(pattern));
    memoryCache.del(keysToDelete);
    
    // Clear Redis cache
    if (redisClient.isOpen) {
      const redisKeys = await redisClient.keys(`*${pattern}*`);
      if (redisKeys.length > 0) {
        await redisClient.del(redisKeys);
      }
      logger.debug(`Cleared cache pattern: ${pattern}, keys: ${keysToDelete.length + redisKeys.length}`);
    }
  } catch (error) {
    logger.error('Clear cache error:', error);
  }
};

// Clear all cache
const clearAllCache = async () => {
  try {
    memoryCache.flushAll();
    if (redisClient.isOpen) {
      await redisClient.flushDb();
    }
    logger.debug('All cache cleared');
  } catch (error) {
    logger.error('Clear all cache error:', error);
  }
};

// Get cache stats
const getCacheStats = () => {
  const memoryStats = memoryCache.getStats();
  return {
    memory: memoryStats,
    redis: redisClient.isOpen ? 'connected' : 'disconnected'
  };
};

// Cache data with custom TTL
const setCache = async (key, data, ttl = 300, useRedis = true) => {
  try {
    memoryCache.set(key, data, Math.min(ttl, 300));
    
    if (useRedis && redisClient.isOpen) {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    }
  } catch (error) {
    logger.error('Set cache error:', error);
  }
};

// Get cached data
const getCache = async (key, useRedis = true) => {
  try {
    // Try memory first
    const memoryData = memoryCache.get(key);
    if (memoryData) return memoryData;
    
    // Try Redis
    if (useRedis && redisClient.isOpen) {
      const redisData = await redisClient.get(key);
      if (redisData) {
        const data = JSON.parse(redisData);
        memoryCache.set(key, data, 60); // Cache in memory
        return data;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Get cache error:', error);
    return null;
  }
};

module.exports = {
  cache: memoryCache,
  redisClient,
  cacheMiddleware,
  clearCacheByPattern,
  clearAllCache,
  getCacheStats,
  setCache,
  getCache
};