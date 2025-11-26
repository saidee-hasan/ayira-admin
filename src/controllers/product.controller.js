const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { CloudinaryService } = require('../config/cloudinary');
const { ROLES, PRODUCT_STATUS } = require('../config/constants');
const { ObjectId } = require('mongodb');
const { cache, redisClient, setCache, getCache, clearCacheByPattern } = require('../middleware/cache');
const logger = require('../utils/logger');
const sharp = require('sharp');

class ProductController {
  // Generate slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Optimized image processing with WebP conversion
  static async processImage(buffer, options = {}) {
    const {
      width = 800,
      height = 800,
      quality = 80,
      format = 'webp'
    } = options;

    return await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      [format]({ quality })
      .toBuffer();
  }

  // Get product form dropdown data with Redis caching
  static async getProductFormData(req, res) {
    try {
      const cacheKey = 'product_form_data';
      
      // Try Redis cache first
      const cachedData = await getCache(cacheKey, true);
      if (cachedData) {
        logger.debug('Returning cached product form data from Redis');
        return ApiResponse.success(res, cachedData, 'Product form data fetched successfully');
      }

      logger.info('Fetching product form data from database...');
      
      const collections = {
        categories: getCollection('categories'),
        subCategories: getCollection('subCategories'),
        brands: getCollection('brands'),
        colors: getCollection('colors'),
        sizes: getCollection('sizes'),
        productFits: getCollection('productFits'),
        sustainability: getCollection('sustainability'),
        certifications: getCollection('certifications')
      };

      // Check which collections are available
      const availableCollections = {};
      for (const [key, collection] of Object.entries(collections)) {
        if (collection) {
          availableCollections[key] = collection;
        } else {
          logger.warn(`Collection ${key} not available`);
        }
      }

      // Fetch all data in parallel with optimized projections
      const fetchData = async (collection, query = {}, projection = {}) => {
        try {
          return await collection.find(query, { projection }).toArray();
        } catch (error) {
          logger.error(`Error fetching ${collection.collectionName}:`, error);
          return [];
        }
      };

      // Use minimal projections for better performance
      const minimalProjection = { name: 1, _id: 1, status: 1 };
      
      const [
        categories,
        subCategories,
        brands,
        colors,
        sizes,
        productFits,
        sustainability,
        certifications
      ] = await Promise.all([
        availableCollections.categories ? 
          fetchData(availableCollections.categories, { status: 'active' }, minimalProjection) : [],
        availableCollections.subCategories ? 
          fetchData(availableCollections.subCategories, { status: 'active' }, { ...minimalProjection, category: 1 }) : [],
        availableCollections.brands ? 
          fetchData(availableCollections.brands, { status: 'active' }, minimalProjection) : [],
        availableCollections.colors ? 
          fetchData(availableCollections.colors, { status: 'active' }, { ...minimalProjection, colorCode: 1 }) : [],
        availableCollections.sizes ? 
          fetchData(availableCollections.sizes, { status: 'active' }, minimalProjection) : [],
        availableCollections.productFits ? 
          fetchData(availableCollections.productFits, { status: 'active' }, minimalProjection) : [],
        availableCollections.sustainability ? 
          fetchData(availableCollections.sustainability, { status: 'active' }, minimalProjection) : [],
        availableCollections.certifications ? 
          fetchData(availableCollections.certifications, { status: 'active' }, minimalProjection) : []
      ]);

      const formData = {
        categories: categories || [],
        subCategories: subCategories || [],
        brands: brands || [],
        colors: colors || [],
        sizes: sizes || [],
        productFits: productFits || [],
        sustainability: sustainability || [],
        certifications: certifications || [],
        productStatus: Object.values(PRODUCT_STATUS),
        gender: ['Men', 'Women', 'Unisex', 'Boys', 'Girls']
      };

      logger.info('Form data fetched successfully:', {
        categories: formData.categories.length,
        subCategories: formData.subCategories.length,
        brands: formData.brands.length,
        colors: formData.colors.length,
        sizes: formData.sizes.length,
        productFits: formData.productFits.length,
        sustainability: formData.sustainability.length,
        certifications: formData.certifications.length
      });

      // Cache in Redis for 2 hours
      await setCache(cacheKey, formData, 7200, true);

      return ApiResponse.success(res, formData, 'Product form data fetched successfully');
    } catch (error) {
      logger.error('Get product form data error:', error);
      return ApiResponse.error(res, 'Failed to fetch form data: ' + error.message);
    }
  }

  // Create Product with optimized operations
  static async createProduct(req, res) {
    try {
      logger.info('Creating product...');

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      // Extract form data
      const {
        title,
        productCode,
        gsmCode,
        category,
        subCategory,
        productStatus,
        sizes,
        colors,
        gender,
        fit,
        sustainability,
        brand,
        price,
        discountPrice,
        quantity,
        bulkQuantity,
        price100Pcs,
        price200Pcs,
        price500Pcs,
        shortDescription,
        richDescription,
        printingEmbroidery,
        textileCare,
        metaTitle,
        mainImageAltText,
        metaDescription,
        metaKeywords,
        youtubeUrl,
        certifications
      } = req.body;

      // Validate required fields
      if (!title || !productCode || !category || !subCategory) {
        return ApiResponse.error(res, 'Required fields are missing', 400);
      }

      // Generate slug from title
      const slug = ProductController.generateSlug(title);

      // Handle file uploads from Cloudinary
      let mainImageUrl = '';
      let mainImagePublicId = '';
      let sizeChartImageUrl = '';
      let sizeChartImagePublicId = '';
      const galleryImages = [];

      // Process main image
      if (req.cloudinaryResults) {
        const mainImageResult = req.cloudinaryResults.find(result => 
          result.fieldname === 'mainImage'
        );
        if (mainImageResult) {
          mainImageUrl = mainImageResult.secure_url;
          mainImagePublicId = mainImageResult.public_id;
        }

        // Process gallery images
        const galleryResults = req.cloudinaryResults.filter(result => 
          result.fieldname === 'galleryImages'
        );
        galleryResults.forEach(result => {
          galleryImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            altText: '',
            uploadedAt: new Date()
          });
        });

        // Process size chart image
        const sizeChartResult = req.cloudinaryResults.find(result => 
          result.fieldname === 'sizeChartImage'
        );
        if (sizeChartResult) {
          sizeChartImageUrl = sizeChartResult.secure_url;
          sizeChartImagePublicId = sizeChartResult.public_id;
        }
      }

      // Parse array fields efficiently
      const sizesArray = Array.isArray(sizes) ? sizes : (sizes ? sizes.split(',') : []);
      const colorsArray = Array.isArray(colors) ? colors : (colors ? colors.split(',') : []);
      const genderArray = Array.isArray(gender) ? gender : (gender ? gender.split(',') : []);
      const certificationsArray = Array.isArray(certifications) ? certifications : (certifications ? certifications.split(',') : []);
      const metaKeywordsArray = metaKeywords ? 
        (Array.isArray(metaKeywords) ? metaKeywords : metaKeywords.split(',').map(k => k.trim())) 
        : [];

      // Calculate discount percentage
      const discountPercentage = price && discountPrice && price > discountPrice 
        ? Math.round(((price - discountPrice) / price) * 100)
        : 0;

      // Create product object with popularity and AI recommendation scores
      const productData = {
        title: title.trim(),
        productCode: productCode.trim(),
        gsmCode: gsmCode?.trim() || '',
        category: category,
        subCategory: subCategory,
        productStatus: productStatus || 'active',
        sizes: sizesArray,
        colors: colorsArray,
        gender: genderArray,
        fit: fit || '',
        sustainability: sustainability || '',
        brand: brand || '',
        price: price ? parseFloat(price) : 0,
        discountPrice: discountPrice ? parseFloat(discountPrice) : 0,
        discountPercentage: discountPercentage,
        quantity: quantity ? parseInt(quantity) : 0,
        bulkQuantity: bulkQuantity ? parseInt(bulkQuantity) : 0,
        price100Pcs: price100Pcs ? parseFloat(price100Pcs) : 0,
        price200Pcs: price200Pcs ? parseFloat(price200Pcs) : 0,
        price500Pcs: price500Pcs ? parseFloat(price500Pcs) : 0,
        shortDescription: shortDescription || '',
        richDescription: richDescription || '',
        printingEmbroidery: printingEmbroidery || '',
        textileCare: textileCare || '',
        metaTitle: metaTitle || '',
        mainImageAltText: mainImageAltText || '',
        metaDescription: metaDescription || '',
        metaKeywords: metaKeywordsArray,
        youtubeUrl: youtubeUrl || '',
        certifications: certificationsArray,
        mainImage: mainImageUrl,
        mainImagePublicId: mainImagePublicId,
        galleryImages: galleryImages,
        sizeChartImage: sizeChartImageUrl,
        sizeChartImagePublicId: sizeChartImagePublicId,
        slug: slug,
        
        // Popularity and AI recommendation fields
        popularityScore: 0,
        searchBoostScore: 0,
        viewCount: 0,
        lastViewedAt: null,
        aiRecommendationScore: 0,
        recentlyReviewedScore: 0,
        
        sellerId: req.user?._id?.toString() || req.user?.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user?.userId || 'system',
        updatedBy: req.user?.userId || 'system'
      };

      // Insert into database
      const result = await productsCollection.insertOne(productData);

      if (!result.insertedId) {
        throw new Error('Failed to create product');
      }

      // Fetch the created product with minimal fields for response
      const createdProduct = await productsCollection.findOne(
        { _id: result.insertedId },
        { projection: { 
          title: 1, productCode: 1, slug: 1, price: 1, 
          discountPrice: 1, mainImage: 1, status: 1 
        }}
      );

      logger.info('Product created successfully:', createdProduct._id);

      // Clear relevant caches asynchronously
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern('product_form_data')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(
        res, 
        createdProduct, 
        'Product created successfully', 
        201
      );

    } catch (error) {
      // Clean up uploaded files if product creation fails
      if (req.cloudinaryResults && req.cloudinaryResults.length > 0) {
        await Promise.allSettled(
          req.cloudinaryResults.map(result => 
            CloudinaryService.deleteFile(result.public_id)
              .catch(err => logger.error('Failed to delete Cloudinary file:', err))
          )
        );
      }
      logger.error('Create product error:', error);
      return ApiResponse.error(res, 'Failed to create product: ' + error.message);
    }
  }

  // Get All Products with advanced Redis caching
  static async getProducts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 12, 
        search, 
        category,
        subCategory,
        brand,
        minPrice,
        maxPrice,
        status,
        sizes,
        colors,
        gender,
        sortBy = 'popularityScore',
        sortOrder = 'desc'
      } = req.query;

      // Generate cache key based on query parameters
      const cacheKey = `products:${JSON.stringify(req.query)}`;
      
      // Try Redis cache first
      const cachedResult = await getCache(cacheKey, true);
      if (cachedResult) {
        logger.debug(`Returning cached products for key: ${cacheKey}`);
        return ApiResponse.success(res, cachedResult);
      }

      let query = {};
      
      // Build optimized filter query
      if (category) query.category = category;
      if (subCategory) query.subCategory = subCategory;
      if (brand) query.brand = brand;
      if (status) query.productStatus = status;

      // Price range filter optimization
      if (minPrice || maxPrice) {
        const priceFilter = {};
        if (minPrice) priceFilter.$gte = parseFloat(minPrice);
        if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
        
        query.$or = [
          { price: priceFilter },
          { discountPrice: priceFilter },
          { price100Pcs: priceFilter },
          { price200Pcs: priceFilter },
          { price500Pcs: priceFilter }
        ];
      }

      // Array filters optimization
      if (sizes) {
        const sizeArray = Array.isArray(sizes) ? sizes : [sizes];
        query.sizes = { $in: sizeArray };
      }

      if (colors) {
        const colorArray = Array.isArray(colors) ? colors : [colors];
        query.colors = { $in: colorArray };
      }

      if (gender) {
        const genderArray = Array.isArray(gender) ? gender : [gender];
        query.gender = { $in: genderArray };
      }

      // Search optimization with text index support
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { productCode: new RegExp(search, 'i') },
          { shortDescription: new RegExp(search, 'i') },
          { metaKeywords: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Use Promise.all for parallel execution with optimized projections
      const [products, total] = await Promise.all([
        productsCollection
          .find(query, {
            projection: {
              title: 1,
              productCode: 1,
              gsmCode: 1,
              slug: 1,
              price: 1,
              discountPrice: 1,
              discountPercentage: 1,
              quantity: 1,
              bulkQuantity: 1,
              price100Pcs: 1,
              price200Pcs: 1,
              price500Pcs: 1,
              mainImage: 1,
              galleryImages: 1,
              sizeChartImage: 1,
              category: 1,
              subCategory: 1,
              brand: 1,
              sizes: 1,
              colors: 1,
              gender: 1,
              fit: 1,
              sustainability: 1,
              productStatus: 1,
              shortDescription: 1,
              richDescription: 1,
              printingEmbroidery: 1,
              textileCare: 1,
              metaTitle: 1,
              mainImageAltText: 1,
              metaDescription: 1,
              metaKeywords: 1,
              youtubeUrl: 1,
              certifications: 1,
              popularityScore: 1,
              searchBoostScore: 1,
              viewCount: 1,
              lastViewedAt: 1,
              aiRecommendationScore: 1,
              recentlyReviewedScore: 1,
              sellerId: 1,
              createdAt: 1,
              updatedAt: 1,
              createdBy: 1,
              updatedBy: 1
            }
          })
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        productsCollection.countDocuments(query)
      ]);

      const result = {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result for 5 minutes in Redis
      await setCache(cacheKey, result, 300, true);

      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Get products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Product by ID with enhanced error handling
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🟡 Fetching product with ID:', id);
      
      // Validate ID format
      if (!id || id === 'undefined' || id === 'null') {
        console.log('🔴 Invalid product ID:', id);
        return ApiResponse.error(res, 'Invalid product ID', 400);
      }

      if (!ObjectId.isValid(id)) {
        console.log('🔴 Invalid ObjectId format:', id);
        // Try to find by slug instead
        const productsCollection = getCollection('products');
        const productBySlug = await productsCollection.findOne({ slug: id });
        if (productBySlug) {
          console.log('🟢 Found product by slug:', id);
          return ApiResponse.success(res, productBySlug);
        }
        return ApiResponse.error(res, 'Invalid product ID format', 400);
      }

      const cacheKey = `product:${id}`;
      
      // Try Redis cache first
      try {
        const cachedProduct = await getCache(cacheKey, true);
        if (cachedProduct) {
          console.log('🟢 Returning cached product:', id);
          return ApiResponse.success(res, cachedProduct);
        }
      } catch (cacheError) {
        console.log('🟡 Cache error, fetching from DB:', cacheError.message);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        console.log('🔴 Products collection not available');
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      console.log('🟡 Querying database for product:', id);
      
      const product = await productsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      console.log('🟡 Database query result:', product ? 'Found' : 'Not found');

      if (!product) {
        console.log('🔴 Product not found in database:', id);
        return ApiResponse.error(res, 'Product not found', 404);
      }

      console.log('🟢 Product found:', product.title);

      // Cache the product for 10 minutes in Redis
      try {
        await setCache(cacheKey, product, 600, true);
      } catch (cacheError) {
        console.log('🟡 Cache set error:', cacheError.message);
      }

      // Increment view count and update popularity score (non-blocking)
      this.updateProductViews(product._id.toString())
        .catch(err => console.error('Error updating product views:', err));

      return ApiResponse.success(res, product);
      
    } catch (error) {
      console.error('🔴 Get product by ID error:', error);
      console.error('Error stack:', error.stack);
      
      // More specific error messages
      if (error.name === 'BSONError') {
        return ApiResponse.error(res, 'Invalid product ID format', 400);
      }
      if (error.name === 'MongoError') {
        return ApiResponse.error(res, 'Database error', 500);
      }
      
      return ApiResponse.error(res, `Failed to fetch product: ${error.message}`);
    }
  }

  // Update product view count and popularity scores (optimized)
  static async updateProductViews(productId) {
    try {
      const productsCollection = getCollection('products');
      if (!productsCollection) return;

      const updateData = {
        $inc: { 
          viewCount: 1,
          popularityScore: 1,
          recentlyReviewedScore: 0.5
        },
        $set: { 
          lastViewedAt: new Date() 
        }
      };

      await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        updateData
      );

      // Clear cache for this product
      await clearCacheByPattern(`product:${productId}`);
    } catch (error) {
      logger.error('Update product views error:', error);
    }
  }

  // Update Product with Redis cache invalidation
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product ID', 400);
      }

      // Check if user can update this product
      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const existingProduct = await productsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!existingProduct) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      // Seller can only update their own products
      if (req.user.role === ROLES.SELLER && 
          existingProduct.sellerId !== req.user._id.toString()) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      // Generate new slug if title is updated
      if (updateData.title && updateData.title !== existingProduct.title) {
        updateData.slug = ProductController.generateSlug(updateData.title);
      }

      // Handle Cloudinary uploads for update with parallel deletion
      if (req.cloudinaryResults && req.cloudinaryResults.length > 0) {
        const mainImage = req.cloudinaryResults.find(result => 
          result.fieldname === 'mainImage'
        );
        if (mainImage) {
          updateData.mainImage = mainImage.secure_url;
          updateData.mainImagePublicId = mainImage.public_id;
          
          // Delete old main image from Cloudinary (non-blocking)
          if (existingProduct.mainImagePublicId) {
            CloudinaryService.deleteFile(existingProduct.mainImagePublicId)
              .catch(err => logger.error('Error deleting old main image:', err));
          }
        }

        const galleryImages = req.cloudinaryResults.filter(result => 
          result.fieldname === 'galleryImages'
        );
        if (galleryImages.length > 0) {
          updateData.galleryImages = galleryImages.map(img => ({
            url: img.secure_url,
            publicId: img.public_id,
            altText: '',
            uploadedAt: new Date()
          }));
          
          // Delete old gallery images from Cloudinary in parallel
          if (existingProduct.galleryImages) {
            await Promise.allSettled(
              existingProduct.galleryImages.map(oldImage => 
                oldImage.publicId ? 
                  CloudinaryService.deleteFile(oldImage.publicId)
                    .catch(err => logger.error('Error deleting old gallery image:', err))
                  : Promise.resolve()
              )
            );
          }
        }

        const sizeChartImage = req.cloudinaryResults.find(result => 
          result.fieldname === 'sizeChartImage'
        );
        if (sizeChartImage) {
          updateData.sizeChartImage = sizeChartImage.secure_url;
          updateData.sizeChartImagePublicId = sizeChartImage.public_id;
          
          // Delete old size chart image from Cloudinary (non-blocking)
          if (existingProduct.sizeChartImagePublicId) {
            CloudinaryService.deleteFile(existingProduct.sizeChartImagePublicId)
              .catch(err => logger.error('Error deleting old size chart image:', err));
          }
        }
      }

      // Calculate discount percentage if prices are updated
      if (updateData.price || updateData.discountPrice) {
        const price = updateData.price ? parseFloat(updateData.price) : existingProduct.price;
        const discountPrice = updateData.discountPrice ? parseFloat(updateData.discountPrice) : existingProduct.discountPrice;
        
        if (price && discountPrice && price > discountPrice) {
          updateData.discountPercentage = Math.round(((price - discountPrice) / price) * 100);
        } else {
          updateData.discountPercentage = 0;
        }
      }

      // Prepare update data
      const finalUpdateData = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: req.user?.userId || 'system'
      };

      // Convert string arrays to arrays if needed
      if (finalUpdateData.sizes && typeof finalUpdateData.sizes === 'string') {
        finalUpdateData.sizes = finalUpdateData.sizes.split(',');
      }
      if (finalUpdateData.colors && typeof finalUpdateData.colors === 'string') {
        finalUpdateData.colors = finalUpdateData.colors.split(',');
      }
      if (finalUpdateData.gender && typeof finalUpdateData.gender === 'string') {
        finalUpdateData.gender = finalUpdateData.gender.split(',');
      }
      if (finalUpdateData.certifications && typeof finalUpdateData.certifications === 'string') {
        finalUpdateData.certifications = finalUpdateData.certifications.split(',');
      }
      if (finalUpdateData.metaKeywords && typeof finalUpdateData.metaKeywords === 'string') {
        finalUpdateData.metaKeywords = finalUpdateData.metaKeywords.split(',').map(k => k.trim());
      }

      // Parse numeric fields
      if (finalUpdateData.price) finalUpdateData.price = parseFloat(finalUpdateData.price);
      if (finalUpdateData.discountPrice) finalUpdateData.discountPrice = parseFloat(finalUpdateData.discountPrice);
      if (finalUpdateData.quantity) finalUpdateData.quantity = parseInt(finalUpdateData.quantity);
      if (finalUpdateData.bulkQuantity) finalUpdateData.bulkQuantity = parseInt(finalUpdateData.bulkQuantity);
      if (finalUpdateData.price100Pcs) finalUpdateData.price100Pcs = parseFloat(finalUpdateData.price100Pcs);
      if (finalUpdateData.price200Pcs) finalUpdateData.price200Pcs = parseFloat(finalUpdateData.price200Pcs);
      if (finalUpdateData.price500Pcs) finalUpdateData.price500Pcs = parseFloat(finalUpdateData.price500Pcs);

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: finalUpdateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      const updatedProduct = await productsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      // Clear relevant caches asynchronously
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern(`product:${id}`),
        clearCacheByPattern('product_form_data')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(res, updatedProduct, 'Product updated successfully');
    } catch (error) {
      logger.error('Update product error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Product with Redis cache cleanup
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product ID', 400);
      }

      // Check if user can delete this product
      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const existingProduct = await productsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!existingProduct) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      // Seller can only delete their own products
      if (req.user.role === ROLES.SELLER && 
          existingProduct.sellerId !== req.user._id.toString()) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      // Delete images from Cloudinary in parallel
      const deletePromises = [];
      
      if (existingProduct.mainImagePublicId) {
        deletePromises.push(
          CloudinaryService.deleteFile(existingProduct.mainImagePublicId)
            .catch(err => logger.error('Error deleting main image:', err))
        );
      }

      if (existingProduct.galleryImages) {
        for (const image of existingProduct.galleryImages) {
          if (image.publicId) {
            deletePromises.push(
              CloudinaryService.deleteFile(image.publicId)
                .catch(err => logger.error('Error deleting gallery image:', err))
            );
          }
        }
      }

      if (existingProduct.sizeChartImagePublicId) {
        deletePromises.push(
          CloudinaryService.deleteFile(existingProduct.sizeChartImagePublicId)
            .catch(err => logger.error('Error deleting size chart image:', err))
        );
      }

      // Wait for all delete operations to complete
      await Promise.allSettled(deletePromises);

      const result = await productsCollection.deleteOne({ 
        _id: new ObjectId(id) 
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      // Clear relevant caches asynchronously
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern(`product:${id}`),
        clearCacheByPattern('product_form_data')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(res, null, 'Product deleted successfully');
    } catch (error) {
      logger.error('Delete product error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Seller's Products with Redis caching
  static async getSellerProducts(req, res) {
    try {
      const sellerId = req.user._id.toString();
      const { page = 1, limit = 10 } = req.query;

      const cacheKey = `seller_products:${sellerId}:${page}:${limit}`;
      
      // Try Redis cache first
      const cachedResult = await getCache(cacheKey, true);
      if (cachedResult) {
        logger.debug(`Returning cached seller products for: ${sellerId}`);
        return ApiResponse.success(res, cachedResult);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const query = { sellerId: sellerId };
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Use Promise.all for parallel execution with optimized projection
      const [products, total] = await Promise.all([
        productsCollection
          .find(query, {
            projection: {
              title: 1, productCode: 1, slug: 1, price: 1, discountPrice: 1,
              price100Pcs: 1, price200Pcs: 1, price500Pcs: 1,
              mainImage: 1, productStatus: 1, quantity: 1, bulkQuantity: 1,
              viewCount: 1, createdAt: 1, updatedAt: 1
            }
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        productsCollection.countDocuments(query)
      ]);

      const result = {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache for 2 minutes in Redis
      await setCache(cacheKey, result, 120, true);

      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Get seller products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Search Products with Redis caching and popularity boosting
  static async searchProducts(req, res) {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q) {
        return ApiResponse.error(res, 'Search query is required', 400);
      }

      const cacheKey = `search:${q}:${page}:${limit}`;
      
      // Try Redis cache first
      const cachedResult = await getCache(cacheKey, true);
      if (cachedResult) {
        logger.debug(`Returning cached search results for: ${q}`);
        return ApiResponse.success(res, cachedResult);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const query = {
        $or: [
          { title: new RegExp(q, 'i') },
          { productCode: new RegExp(q, 'i') },
          { shortDescription: new RegExp(q, 'i') },
          { richDescription: new RegExp(q, 'i') },
          { metaKeywords: { $in: [new RegExp(q, 'i')] } }
        ]
      };

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Use Promise.all for parallel execution
      const [products, total] = await Promise.all([
        productsCollection
          .find(query, {
            projection: {
              title: 1, productCode: 1, slug: 1, price: 1, discountPrice: 1,
              price100Pcs: 1, price200Pcs: 1, price500Pcs: 1,
              mainImage: 1, shortDescription: 1, popularityScore: 1,
              searchBoostScore: 1
            }
          })
          .sort({ searchBoostScore: -1, popularityScore: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        productsCollection.countDocuments(query)
      ]);

      const result = {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache search results for 3 minutes
      await setCache(cacheKey, result, 180, true);

      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Search products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Popular Products with Redis caching
  static async getPopularProducts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = `popular_products:${limit}`;

      // Try Redis cache first
      const cachedProducts = await getCache(cacheKey, true);
      if (cachedProducts) {
        logger.debug('Returning cached popular products');
        return ApiResponse.success(res, cachedProducts);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const products = await productsCollection
        .find({ productStatus: 'active' }, {
          projection: {
            title: 1, productCode: 1, slug: 1, price: 1, discountPrice: 1,
            price100Pcs: 1, price200Pcs: 1, price500Pcs: 1,
            mainImage: 1, popularityScore: 1, viewCount: 1, 
            recentlyReviewedScore: 1
          }
        })
        .sort({ popularityScore: -1, recentlyReviewedScore: -1 })
        .limit(parseInt(limit))
        .toArray();

      // Cache popular products for 10 minutes
      await setCache(cacheKey, products, 600, true);

      return ApiResponse.success(res, products);
    } catch (error) {
      logger.error('Get popular products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update AI Recommendation Scores with cache invalidation
  static async updateAiScores(req, res) {
    try {
      const { productId, aiRecommendationScore, searchBoostScore } = req.body;

      if (!ObjectId.isValid(productId)) {
        return ApiResponse.error(res, 'Invalid product ID', 400);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const updateData = {
        updatedAt: new Date()
      };

      if (aiRecommendationScore !== undefined) {
        updateData.aiRecommendationScore = parseFloat(aiRecommendationScore);
      }

      if (searchBoostScore !== undefined) {
        updateData.searchBoostScore = parseFloat(searchBoostScore);
      }

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      // Clear relevant caches asynchronously
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern(`product:${productId}`),
        clearCacheByPattern('popular_products:')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(res, null, 'AI scores updated successfully');
    } catch (error) {
      logger.error('Update AI scores error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get related products with Redis caching
  static async getRelatedProducts(req, res) {
    try {
      const { productId, limit = 8 } = req.query;

      if (!productId || !ObjectId.isValid(productId)) {
        return ApiResponse.error(res, 'Valid product ID is required', 400);
      }

      const cacheKey = `related_products:${productId}:${limit}`;
      
      // Try Redis cache first
      const cachedProducts = await getCache(cacheKey, true);
      if (cachedProducts) {
        logger.debug(`Returning cached related products for: ${productId}`);
        return ApiResponse.success(res, cachedProducts);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      // Get the current product to find related ones
      const currentProduct = await productsCollection.findOne(
        { _id: new ObjectId(productId) },
        { projection: { category: 1, subCategory: 1, brand: 1, colors: 1, certifications: 1 } }
      );

      if (!currentProduct) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      const query = {
        _id: { $ne: new ObjectId(productId) },
        productStatus: 'active',
        $or: [
          { category: currentProduct.category },
          { subCategory: currentProduct.subCategory },
          { brand: currentProduct.brand },
          { colors: { $in: currentProduct.colors || [] } },
          { certifications: { $in: currentProduct.certifications || [] } }
        ]
      };

      const relatedProducts = await productsCollection
        .find(query, {
          projection: {
            title: 1, productCode: 1, slug: 1, price: 1, discountPrice: 1,
            price100Pcs: 1, price200Pcs: 1, price500Pcs: 1,
            mainImage: 1, category: 1, brand: 1, certifications: 1
          }
        })
        .sort({ popularityScore: -1, aiRecommendationScore: -1 })
        .limit(parseInt(limit))
        .toArray();

      // Cache related products for 15 minutes
      await setCache(cacheKey, relatedProducts, 900, true);

      return ApiResponse.success(res, relatedProducts, 'Related products fetched successfully');
    } catch (error) {
      logger.error('Get related products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Bulk update products (admin only)
  static async bulkUpdateProducts(req, res) {
    try {
      const { productIds, updateData } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return ApiResponse.error(res, 'Product IDs array is required', 400);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const objectIds = productIds.map(id => new ObjectId(id));
      
      const result = await productsCollection.updateMany(
        { _id: { $in: objectIds } },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date(),
            updatedBy: req.user?.userId || 'system'
          }
        }
      );

      // Clear all product-related caches
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern('product:'),
        clearCacheByPattern('popular_products:'),
        clearCacheByPattern('seller_products:'),
        clearCacheByPattern('search:'),
        clearCacheByPattern('related_products:')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(
        res, 
        { 
          matchedCount: result.matchedCount, 
          modifiedCount: result.modifiedCount 
        }, 
        'Products updated successfully'
      );
    } catch (error) {
      logger.error('Bulk update products error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get all products for admin with advanced filtering
  static async getAllProductsAdmin(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        category,
        subCategory,
        brand,
        status,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const cacheKey = `admin_products:${JSON.stringify(req.query)}`;
      
      // Try Redis cache first
      const cachedResult = await getCache(cacheKey, true);
      if (cachedResult) {
        logger.debug('Returning cached admin products');
        return ApiResponse.success(res, cachedResult);
      }

      let query = {};
      
      // Build filter query
      if (category) query.category = category;
      if (subCategory) query.subCategory = subCategory;
      if (brand) query.brand = brand;
      if (status) query.productStatus = status;

      // Price range filter
      if (minPrice || maxPrice) {
        query.$or = [
          { price: {} },
          { discountPrice: {} },
          { price100Pcs: {} },
          { price200Pcs: {} },
          { price500Pcs: {} }
        ];
        if (minPrice) {
          query.$or[0].price.$gte = parseFloat(minPrice);
          query.$or[1].discountPrice.$gte = parseFloat(minPrice);
          query.$or[2].price100Pcs.$gte = parseFloat(minPrice);
          query.$or[3].price200Pcs.$gte = parseFloat(minPrice);
          query.$or[4].price500Pcs.$gte = parseFloat(minPrice);
        }
        if (maxPrice) {
          query.$or[0].price.$lte = parseFloat(maxPrice);
          query.$or[1].discountPrice.$lte = parseFloat(maxPrice);
          query.$or[2].price100Pcs.$lte = parseFloat(maxPrice);
          query.$or[3].price200Pcs.$lte = parseFloat(maxPrice);
          query.$or[4].price500Pcs.$lte = parseFloat(maxPrice);
        }
      }

      // Search optimization
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { productCode: new RegExp(search, 'i') },
          { shortDescription: new RegExp(search, 'i') }
        ];
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Use Promise.all for parallel execution
      const [products, total] = await Promise.all([
        productsCollection
          .find(query, {
            projection: {
              title: 1, productCode: 1, slug: 1, price: 1, discountPrice: 1,
              price100Pcs: 1, price200Pcs: 1, price500Pcs: 1,
              discountPercentage: 1, mainImage: 1, galleryImages: 1, 
              category: 1, subCategory: 1, brand: 1, sizes: 1, colors: 1,
              gender: 1, productStatus: 1, popularityScore: 1, viewCount: 1,
              createdAt: 1, quantity: 1, bulkQuantity: 1, sellerId: 1, 
              updatedAt: 1, certifications: 1
            }
          })
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        productsCollection.countDocuments(query)
      ]);

      const result = {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache for 2 minutes
      await setCache(cacheKey, result, 120, true);

      return ApiResponse.success(res, result);
    } catch (error) {
      logger.error('Get all products admin error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Quick update product status
  static async quickUpdateStatus(req, res) {
    try {
      const { id } = req.params;
      const { productStatus } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product ID', 400);
      }

      if (!productStatus || !Object.values(PRODUCT_STATUS).includes(productStatus)) {
        return ApiResponse.error(res, 'Valid product status is required', 400);
      }

      const productsCollection = getCollection('products');
      if (!productsCollection) {
        return ApiResponse.error(res, 'Products collection not available', 500);
      }

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            productStatus,
            updatedAt: new Date(),
            updatedBy: req.user?.userId || 'system'
          }
        }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Product not found', 404);
      }

      // Clear relevant caches
      Promise.all([
        clearCacheByPattern('cache:/api/v1/products'),
        clearCacheByPattern(`product:${id}`),
        clearCacheByPattern('admin_products:')
      ]).catch(err => logger.error('Cache clear error:', err));

      return ApiResponse.success(res, null, 'Product status updated successfully');
    } catch (error) {
      logger.error('Quick update status error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = ProductController;