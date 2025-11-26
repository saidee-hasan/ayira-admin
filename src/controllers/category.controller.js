// src/controllers/category.controller.js
const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

class CategoryController {
  // Create Category
  static async createCategory(req, res) {
    try {
      const { value } = req.body;

      if (!value || value.trim() === '') {
        return ApiResponse.error(res, 'Category name is required', 400);
      }

      const categoriesCollection = getCollection('categories');
      if (!categoriesCollection) {
        return ApiResponse.error(res, 'Categories collection not available', 500);
      }

      // Check if category already exists
      const existingCategory = await categoriesCollection.findOne({ 
        value: { $regex: new RegExp(`^${value.trim()}$`, 'i') } 
      });

      if (existingCategory) {
        return ApiResponse.error(res, 'Category already exists', 409);
      }

      const categoryData = {
        value: value.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await categoriesCollection.insertOne(categoryData);

      return ApiResponse.success(
        res,
        { 
          _id: result.insertedId,
          ...categoryData 
        },
        'Category created successfully',
        201
      );
    } catch (error) {
      console.error('Create category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Categories
  static async getCategories(req, res) {
    try {
      const categoriesCollection = getCollection('categories');
      if (!categoriesCollection) {
        return ApiResponse.error(res, 'Categories collection not available', 500);
      }

      const categories = await categoriesCollection
        .find()
        .sort({ value: 1 })
        .toArray();

      return ApiResponse.success(res, categories);
    } catch (error) {
      console.error('Get categories error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update Category
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { value } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid category ID', 400);
      }

      if (!value || value.trim() === '') {
        return ApiResponse.error(res, 'Category name is required', 400);
      }

      const categoriesCollection = getCollection('categories');
      if (!categoriesCollection) {
        return ApiResponse.error(res, 'Categories collection not available', 500);
      }

      // Check if category with same name already exists (excluding current category)
      const existingCategory = await categoriesCollection.findOne({
        value: { $regex: new RegExp(`^${value.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingCategory) {
        return ApiResponse.error(res, 'Category with this name already exists', 409);
      }

      const updateData = {
        value: value.trim(),
        updatedAt: new Date()
      };

      const result = await categoriesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Category not found', 404);
      }

      return ApiResponse.success(res, null, 'Category updated successfully');
    } catch (error) {
      console.error('Update category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Category
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid category ID', 400);
      }

      const categoriesCollection = getCollection('categories');
      if (!categoriesCollection) {
        return ApiResponse.error(res, 'Categories collection not available', 500);
      }

      const result = await categoriesCollection.deleteOne({ 
        _id: new ObjectId(id) 
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Category not found', 404);
      }

      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      console.error('Delete category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Search Categories
  static async searchCategories(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim() === '') {
        return ApiResponse.success(res, []);
      }

      const categoriesCollection = getCollection('categories');
      if (!categoriesCollection) {
        return ApiResponse.error(res, 'Categories collection not available', 500);
      }

      const categories = await categoriesCollection
        .find({ 
          value: { $regex: q, $options: 'i' } 
        })
        .limit(10)
        .toArray();

      return ApiResponse.success(res, categories);
    } catch (error) {
      console.error('Search categories error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = CategoryController;