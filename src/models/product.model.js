const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

class ProductModel {
  static collection() {
    return getCollection('products');
  }

  // Create product
  static async create(productData) {
    const collection = this.collection();
    const result = await collection.insertOne(productData);
    return result;
  }

  // Find products with pagination and filtering
  static async find(query = {}, options = {}) {
    const collection = this.collection();
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      projection = {}
    } = options;

    const skip = (page - 1) * limit;

    const data = await collection
      .find(query, { projection })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Find product by ID
  static async findById(id) {
    const collection = this.collection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  // Update product by ID
  static async updateById(id, updateData) {
    const collection = this.collection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return result;
  }

  // Delete product by ID
  static async deleteById(id) {
    const collection = this.collection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result;
  }

  // Search products
  static async searchProducts(searchTerm, options = {}) {
    const query = {
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { productCode: { $regex: searchTerm, $options: 'i' } },
        { shortDescription: { $regex: searchTerm, $options: 'i' } },
        { richDescription: { $regex: searchTerm, $options: 'i' } },
        { metaKeywords: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    };

    return await this.find(query, options);
  }

  // Get products by seller
  static async findBySeller(sellerId, options = {}) {
    const query = { sellerId };
    return await this.find(query, options);
  }

  // Update product status
  static async updateStatus(id, status) {
    const collection = this.collection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          productStatus: status,
          updatedAt: new Date()
        } 
      }
    );
    return result;
  }

  // Get product statistics
  static async getStats(sellerId = null) {
    const collection = this.collection();
    const query = sellerId ? { sellerId } : {};

    const total = await collection.countDocuments(query);
    const active = await collection.countDocuments({ ...query, productStatus: 'active' });
    const inactive = await collection.countDocuments({ ...query, productStatus: 'inactive' });
    const draft = await collection.countDocuments({ ...query, productStatus: 'draft' });
    const outOfStock = await collection.countDocuments({ ...query, productStatus: 'out-of-stock' });

    return {
      total,
      active,
      inactive,
      draft,
      outOfStock
    };
  }
}

module.exports = ProductModel;