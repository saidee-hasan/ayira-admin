module.exports = {
  ROLES: {
    USER: 'user',
    SELLER: 'seller',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
  },

  PERMISSIONS: {
    // User permissions
    USER: ['read_products', 'create_order', 'read_own_orders', 'update_profile'],
    
    // Seller permissions
    SELLER: ['read_products', 'create_order', 'read_own_orders', 'update_profile', 
             'manage_own_products', 'view_sales', 'manage_own_inventory'],
    
    // Moderator permissions
    MODERATOR: ['read_products', 'create_order', 'read_own_orders', 'update_profile',
                'manage_products', 'manage_users', 'manage_orders', 'manage_blogs',
                'view_analytics', 'manage_comments'],
    
    // Admin permissions (all permissions)
    ADMIN: ['all']
  },

  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    FEATURED: 'featured',
    NEW_ARRIVAL: 'new_arrival',
    TRENDING: 'trending'
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  FILE_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  },

  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600 // 1 hour
  }
};