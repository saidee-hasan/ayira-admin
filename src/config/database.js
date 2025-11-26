const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client = null;
let db = null;

const collections = {};

const connectDB = async () => {
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    db = client.db();
    
    // Initialize Collections - FIXED
    collections.users = db.collection('All-Users');
   // In collections initialization section
collections.products = db.collection('products');
    collections.orders = db.collection('orders');
    collections.blogs = db.collection('blogs');
    collections.banners = db.collection('banners');
    collections.categories = db.collection('categories');
    collections.conversations = db.collection('conversations');
    collections.wishlists = db.collection('wishlists');
    collections.newsletters = db.collection('newsLetters');
    collections.comments = db.collection('comments');
    collections.productAttributes = db.collection('Product-Attributes');
    collections.productReviews = db.collection('Product-Reviews');
    collections.addresses = db.collection('address');
    
    // Brand & Category Collections
    collections.brands = db.collection('brands');
    collections.subCategories = db.collection('sub-categories');
    collections.productFits = db.collection('product-fits');
    
    // Sustainability & Colors
    collections.sustainability = db.collection('sustainability');
    collections.colorData = db.collection('color-data'); // For searching existing colors
    collections.colors = db.collection('colors'); // For saving new colors
    // Add this to your collections object
// In collections initialization
collections.certifications = db.collection('certifications');
    
    // ✅ NEW: Sizes Collection for Product Sizes
    collections.sizes = db.collection('sizes');

    console.log('✅ MongoDB Connected Successfully');
    console.log('📊 Collections initialized:', Object.keys(collections));
    return db;
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

const getDB = () => db;
const getCollection = (name) => {
  if (!collections[name]) {
    console.error(`❌ Collection "${name}" not found`);
    return null;
  }
  return collections[name];
};

// Test connection
const testConnection = async () => {
  try {
    await connectDB();
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

module.exports = { connectDB, getDB, getCollection, testConnection };