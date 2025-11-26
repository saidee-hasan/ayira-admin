// src/controllers/subCategory.controller.js
const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

class SubCategoryController {
  // Create Sub Category
  static async createSubCategory(req, res) {
    try {
      const { name, categoryId, description } = req.body;

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Sub category name is required', 400);
      }

      if (!categoryId || !ObjectId.isValid(categoryId)) {
        return ApiResponse.error(res, 'Valid category ID is required', 400);
      }

      const subCategoriesCollection = getCollection('subCategories');
      const categoriesCollection = getCollection('categories');

      if (!subCategoriesCollection || !categoriesCollection) {
        return ApiResponse.error(res, 'Database collections not available', 500);
      }

      // Check if parent category exists
      const parentCategory = await categoriesCollection.findOne({
        _id: new ObjectId(categoryId)
      });

      if (!parentCategory) {
        return ApiResponse.error(res, 'Parent category not found', 404);
      }

      // Check if sub category already exists under this category
      const existingSubCategory = await subCategoriesCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        categoryId: new ObjectId(categoryId)
      });

      if (existingSubCategory) {
        return ApiResponse.error(res, 'Sub category already exists in this category', 409);
      }

      const subCategoryData = {
        name: name.trim(),
        categoryId: new ObjectId(categoryId),
        categoryName: parentCategory.value,
        description: description?.trim() || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await subCategoriesCollection.insertOne(subCategoryData);

      return ApiResponse.success(
        res,
        {
          _id: result.insertedId,
          ...subCategoryData
        },
        'Sub category created successfully',
        201
      );
    } catch (error) {
      console.error('Create sub category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Sub Categories
  static async getSubCategories(req, res) {
    try {
      const { categoryId, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      let filter = {};
      if (categoryId && ObjectId.isValid(categoryId)) {
        filter.categoryId = new ObjectId(categoryId);
      }

      const subCategories = await subCategoriesCollection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await subCategoriesCollection.countDocuments(filter);

      return ApiResponse.success(res, {
        subCategories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get sub categories error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Sub Categories by Category ID
  static async getSubCategoriesByCategory(req, res) {
    try {
      const { categoryId } = req.params;

      if (!ObjectId.isValid(categoryId)) {
        return ApiResponse.error(res, 'Invalid category ID', 400);
      }

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      const subCategories = await subCategoriesCollection
        .find({ categoryId: new ObjectId(categoryId) })
        .sort({ name: 1 })
        .toArray();

      return ApiResponse.success(res, subCategories);
    } catch (error) {
      console.error('Get sub categories by category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update Sub Category
  static async updateSubCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sub category ID', 400);
      }

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Sub category name is required', 400);
      }

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      // Get current sub category to preserve categoryId
      const currentSubCategory = await subCategoriesCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!currentSubCategory) {
        return ApiResponse.error(res, 'Sub category not found', 404);
      }

      // Check if sub category with same name already exists in the same category
      const existingSubCategory = await subCategoriesCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        categoryId: currentSubCategory.categoryId,
        _id: { $ne: new ObjectId(id) }
      });

      if (existingSubCategory) {
        return ApiResponse.error(res, 'Sub category with this name already exists in this category', 409);
      }

      const updateData = {
        name: name.trim(),
        description: description?.trim() || '',
        updatedAt: new Date()
      };

      const result = await subCategoriesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Sub category not found', 404);
      }

      return ApiResponse.success(res, null, 'Sub category updated successfully');
    } catch (error) {
      console.error('Update sub category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Sub Category
  static async deleteSubCategory(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sub category ID', 400);
      }

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      const result = await subCategoriesCollection.deleteOne({
        _id: new ObjectId(id)
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Sub category not found', 404);
      }

      return ApiResponse.success(res, null, 'Sub category deleted successfully');
    } catch (error) {
      console.error('Delete sub category error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Search Sub Categories
  static async searchSubCategories(req, res) {
    try {
      const { q, categoryId } = req.query;

      if (!q || q.trim() === '') {
        return ApiResponse.success(res, []);
      }

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      let filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      };

      if (categoryId && ObjectId.isValid(categoryId)) {
        filter.categoryId = new ObjectId(categoryId);
      }

      const subCategories = await subCategoriesCollection
        .find(filter)
        .limit(10)
        .toArray();

      return ApiResponse.success(res, subCategories);
    } catch (error) {
      console.error('Search sub categories error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Sub Category by ID
  static async getSubCategoryById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sub category ID', 400);
      }

      const subCategoriesCollection = getCollection('subCategories');
      if (!subCategoriesCollection) {
        return ApiResponse.error(res, 'Sub categories collection not available', 500);
      }

      const subCategory = await subCategoriesCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!subCategory) {
        return ApiResponse.error(res, 'Sub category not found', 404);
      }

      return ApiResponse.success(res, subCategory);
    } catch (error) {
      console.error('Get sub category by ID error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = SubCategoryController;