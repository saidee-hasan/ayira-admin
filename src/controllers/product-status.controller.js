const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');

const productsCollection = () => getCollection('products');

class ProductStatusController {
  // Get featured products
  static async getFeaturedProducts(req, res) {
    try {
      const featuredProducts = await productsCollection()
        .find({ productStatus: "featured" })
        .toArray();

      return ApiResponse.success(res, featuredProducts);
    } catch (error) {
      return ApiResponse.error(res, "Failed to fetch featured products");
    }
  }

  // Get new arrivals
  static async getNewArrivals(req, res) {
    try {
      const newArrivals = await productsCollection()
        .find({ productStatus: "new_arrivals" })
        .toArray();

      return ApiResponse.success(res, newArrivals);
    } catch (error) {
      return ApiResponse.error(res, "Failed to fetch new arrivals");
    }
  }

  // Get trending products
  static async getTrendingProducts(req, res) {
    try {
      const trendingProducts = await productsCollection()
        .find({ productStatus: "trending" })
        .toArray();

      return ApiResponse.success(res, trendingProducts);
    } catch (error) {
      return ApiResponse.error(res, "Failed to fetch trending products");
    }
  }

  // Update product status
  static async updateProductStatus(req, res) {
    try {
      const { id } = req.params;
      const { productStatus } = req.body;

      const { ObjectId } = require('mongodb');
      
      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid product ID", 400);
      }

      const validStatuses = ['active', 'inactive', 'featured', 'new_arrivals', 'trending'];
      if (!validStatuses.includes(productStatus)) {
        return ApiResponse.error(res, "Invalid product status", 400);
      }

      const result = await productsCollection().updateOne(
        { _id: new ObjectId(id) },
        { $set: { productStatus, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, "Product not found", 404);
      }

      return ApiResponse.success(res, null, "Product status updated successfully");
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get products by status with pagination
  static async getProductsByStatus(req, res) {
    try {
      const { status, page = 1, limit = 12 } = req.query;

      const validStatuses = ['active', 'inactive', 'featured', 'new_arrivals', 'trending'];
      if (!validStatuses.includes(status)) {
        return ApiResponse.error(res, "Invalid product status", 400);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [products, total] = await Promise.all([
        productsCollection()
          .find({ productStatus: status })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        productsCollection().countDocuments({ productStatus: status })
      ]);

      return ApiResponse.success(res, {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = ProductStatusController;