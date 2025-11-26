const ProductModel = require('../models/product.model');
const { ObjectId } = require('mongodb');

class ProductService {
  static async createProduct(productData) {
    return await ProductModel.create(productData);
  }

  static async getProducts(filters = {}, options = {}) {
    return await ProductModel.find(filters, options);
  }

  static async getProductById(productId) {
    return await ProductModel.findById(new ObjectId(productId));
  }

  static async updateProduct(productId, updateData) {
    return await ProductModel.updateById(new ObjectId(productId), updateData);
  }

  static async deleteProduct(productId) {
    return await ProductModel.deleteById(new ObjectId(productId));
  }

  static async getFeaturedProducts(limit = 10) {
    return await ProductModel.findByStatus('featured', limit);
  }

  static async getNewArrivals(limit = 10) {
    return await ProductModel.findByStatus('new_arrivals', limit);
  }

  static async searchProducts(searchTerm, options = {}) {
    return await ProductModel.searchProducts(searchTerm, options);
  }

  static async getProductsByCategory(category, options = {}) {
    return await ProductModel.find({ productCategory: category }, options);
  }

  static async getRelatedProducts(productId, category, limit = 5) {
    const product = await this.getProductById(productId);
    if (!product) return [];

    return await ProductModel.find(
      { 
        productCategory: category,
        _id: { $ne: new ObjectId(productId) }
      },
      { limit }
    );
  }
}

module.exports = ProductService;