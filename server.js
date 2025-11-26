require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const { initializeSocket } = require('./src/config/socket');
const { createUploadDirs } = require('./src/utils/fileUpload');
const { cache, redisClient } = require('./src/middleware/cache');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Cluster mode for better performance
if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  logger.info(`Primary ${process.pid} is running`);
  logger.info(`Forking for ${numCPUs} CPUs`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`Worker ${worker.process.pid} died. Forking new worker...`);
    cluster.fork();
  });
} else {
  const startServer = async () => {
    try {
      // Create upload directories
      createUploadDirs();

      // Connect to Redis
      await redisClient.connect();
      logger.info('✅ Redis connected successfully');

      // Connect to Database
      await connectDB();
      logger.info('✅ Database connected successfully');

      // Start Server
      const server = app.listen(PORT, () => {
        logger.info(`
🚀 Ayira Server running on port ${PORT}
📍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: Connected
🔴 Redis: Connected
📁 Upload directories: Created
☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'}
🔗 API URL: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api/docs
❤️  Health Check: http://localhost:${PORT}/health
🔄 Cluster Worker: ${cluster.isWorker ? `Worker ${process.pid}` : 'Single process'}
        `);
      });

      // Initialize Socket.IO
      initializeSocket(server);

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        cache.flushAll();
        await redisClient.quit();
        server.close(() => {
          logger.info('Process terminated');
        });
      });

      process.on('unhandledRejection', async (err) => {
        logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
        logger.error(err.name, err.message);
        await redisClient.quit();
        server.close(() => {
          process.exit(1);
        });
      });

      process.on('uncaughtException', async (err) => {
        logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        logger.error(err.name, err.message);
        await redisClient.quit();
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}