// Updated Product Schema with Popularity and AI Fields (Social media URLs removed)
const productSchema = {
  // Basic Information
  title: { type: String, required: true },
  productCode: { type: String, required: true, unique: true },
  gsmCode: { type: String },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  productStatus: { type: String, enum: ['active', 'inactive', 'featured'], default: 'active' },
  
  // Product Attributes
  sizes: [{ type: String }],
  colors: [{ type: String }],
  gender: [{ type: String }],
  fit: { type: String },
  sustainability: { type: String },
  brand: { type: String },
  
  // Pricing and Inventory
  price: { type: Number, default: 0 },
  discountPrice: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  
  // Descriptions
  shortDescription: { type: String },
  richDescription: { type: String },
  printingEmbroidery: { type: String },
  textileCare: { type: String },
  
  // SEO (Social media URLs removed, only YouTube remains optional)
  metaTitle: { type: String },
  mainImageAltText: { type: String },
  metaDescription: { type: String },
  metaKeywords: [{ type: String }],
  youtubeUrl: { type: String }, // Optional YouTube URL only
  slug: { type: String, unique: true },
  
  // Media Files
  mainImage: { type: String },
  mainImagePublicId: { type: String },
  galleryImages: [{
    url: { type: String },
    publicId: { type: String },
    altText: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  sizeChartImage: { type: String },
  sizeChartImagePublicId: { type: String },
  mainPdf: { type: String },
  
  // Popularity and AI Recommendation Scores
  popularityScore: { type: Number, default: 0 },
  searchBoostScore: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date },
  aiRecommendationScore: { type: Number, default: 0 },
  recentlyReviewedScore: { type: Number, default: 0 },
  
  // System Fields
  sellerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  updatedBy: { type: String }
};