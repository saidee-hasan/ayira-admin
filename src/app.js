const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');


// Performance optimizations
const { cacheMiddleware, clearCacheByPattern } = require('./middleware/cache');
const logger = require('./utils/logger');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const productStatusRoutes = require('./routes/product-status.routes');
const colorRoutes = require('./routes/color.routes');
const subCategoryRoutes = require('./routes/subCategory.routes');
const productFitRoutes = require('./routes/productFit.routes');
const brandRoutes = require('./routes/brand.routes');
const sustainabilityRoutes = require('./routes/sustainability.routes');
const sizeRoutes = require('./routes/size.routes');
const certificationRoutes = require('./routes/certification.routes');

// Middleware
const { generalLimiter } = require('./middleware/rateLimit');
const { handleMulterError } = require('./middleware/upload');

const app = express();

// Security Middleware with enhanced settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Enhanced compression with better settings
app.use(compression({
  level: 6, // Optimal compression level
  threshold: 1024, // Compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Enhanced logging with Pino
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Body Parsing with optimized limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://ayira-ecommerce-main.vercel.app",
    "https://aaryansourcing.com",
    "http://localhost:5173",
    "https://devnas1.vercel.app",
    "https://aaryan-admin.netlify.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate Limiting
app.use(generalLimiter);

// Static Files with optimized cache control
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d', // Longer cache for static files
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Cache middleware for public routes with Redis
app.use('/api/v1/products', cacheMiddleware(300, true)); // 5 minutes with Redis
app.use('/api/v1/categories', cacheMiddleware(3600, true)); // 1 hour with Redis
app.use('/api/v1/brands', cacheMiddleware(1800, true)); // 30 minutes with Redis

// API Routes v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/product-status', productStatusRoutes);
app.use('/api/v1/colors', colorRoutes);
app.use('/api/v1/sizes', sizeRoutes);
app.use('/api/v1/product-fits', productFitRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/sub-categories', subCategoryRoutes);
app.use('/api/v1/sustainability', sustainabilityRoutes);
app.use('/api/v1/certifications', certificationRoutes);

// Performance monitoring route
app.get('/api/performance', cacheMiddleware(30, false), (req, res) => {
  const { getCacheStats } = require('./src/middleware/cache');
  
  res.status(200).json({ 
    status: 'OK',
    cache: getCacheStats(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Cache management routes (admin only)
app.delete('/api/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.query;
    if (pattern) {
      await clearCacheByPattern(pattern);
      res.json({ success: true, message: `Cache cleared for pattern: ${pattern}` });
    } else {
      const { clearAllCache } = require('./src/middleware/cache');
      await clearAllCache();
      res.json({ success: true, message: 'All cache cleared' });
    }
  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cache' });
  }
});

// Health Check with caching
app.get('/health', cacheMiddleware(30, false), (req, res) => {
  const { redisClient } = require('./src/middleware/cache');
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// Root Route
app.get('/', cacheMiddleware(60, true), (req, res) => {
  res.json({ 
    message: 'Ayira E-commerce API', 
    version: '2.0.0',
    documentation: '/api/docs',
    status: 'Running 🚀',
    endpoints: {
      v1: '/api/v1',
      legacy: '/api/legacy',
      health: '/health',
      docs: '/api/docs',
      performance: '/api/performance'
    }
  });
});

// API Documentation with caching
app.get('/api/docs', cacheMiddleware(3600, true), (req, res) => {
  res.json({
    message: 'API Documentation - Ayira E-commerce',
    version: '2.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    apiVersions: {
      v1: '/api/v1',
      legacy: '/api/legacy'
    },
    mainEndpoints: {
      products: '/api/v1/products',
      users: '/api/v1/users',
      orders: '/api/v1/orders',
      blogs: '/api/v1/blogs',
      chat: '/api/v1/chat',
      colors: '/api/v1/colors'
    },
    features: [
      'Product Management',
      'User Management', 
      'Order Processing',
      'Blog System',
      'Real-time Chat',
      'Color Management',
      'File Upload',
      'AI Integration',
      'Dashboard Analytics'
    ]
  });
});

// Multer Error Handling
app.use(handleMulterError);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/api/v1',
      '/api/legacy', 
      '/health',
      '/api/docs',
      '/api/performance'
    ]
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  logger.error('Global Error:', error);
  
  const statusCode = error.status || 500;
  const message = error.message || 'Internal server error';
  
  const errorResponse = {
    success: false, 
    message,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = error.message;
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = app;