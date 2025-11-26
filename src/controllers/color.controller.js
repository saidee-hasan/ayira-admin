// src/controllers/color.controller.js
const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

class ColorController {
  // Get colors from color-data collection (for search)
  static async getColorData(req, res) {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let filter = {};
      
      // Search functionality
      if (search && search.trim() !== '') {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { hex: { $regex: search, $options: 'i' } },
          { rgb: { $regex: search, $options: 'i' } },
          { families: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const colorDataCollection = getCollection('colorData');
      if (!colorDataCollection) {
        return ApiResponse.error(res, 'Color data collection not available', 500);
      }

      const colors = await colorDataCollection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await colorDataCollection.countDocuments(filter);

      return ApiResponse.success(res, {
        colors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get color data error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Add new color to colors collection
  static async addColor(req, res) {
    try {
      const { name, hex, rgb, families = [] } = req.body;

      console.log('Adding color:', { name, hex, rgb, families });

      // At least one field is required
      if (!name && !hex && !rgb) {
        return ApiResponse.error(res, 'At least one of name, hex or rgb is required', 400);
      }

      const colorsCollection = getCollection('colors');
      if (!colorsCollection) {
        return ApiResponse.error(res, 'Colors collection not available', 500);
      }

      // Check if color already exists in colors collection
      const existingColor = await colorsCollection.findOne({
        $or: [
          name ? { name: { $regex: new RegExp(`^${name}$`, 'i') } } : { _id: null },
          hex ? { hex: { $regex: new RegExp(`^${hex}$`, 'i') } } : { _id: null },
          rgb ? { rgb: { $regex: new RegExp(`^${rgb}$`, 'i') } } : { _id: null }
        ].filter(condition => !condition._id)
      });

      if (existingColor) {
        return ApiResponse.error(res, 'Color already exists in your collection', 409);
      }

      const colorData = {
        name: name || '',
        hex: hex || '',
        rgb: rgb || '',
        families: Array.isArray(families) ? families : [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await colorsCollection.insertOne(colorData);

      return ApiResponse.success(
        res,
        { 
          _id: result.insertedId,
          ...colorData
        },
        'Color added successfully',
        201
      );
    } catch (error) {
      console.error('Add color error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get all colors from colors collection (user's saved colors)
  static async getColors(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let filter = {};
      
      if (search && search.trim() !== '') {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { hex: { $regex: search, $options: 'i' } },
          { rgb: { $regex: search, $options: 'i' } },
          { families: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const colorsCollection = getCollection('colors');
      if (!colorsCollection) {
        return ApiResponse.error(res, 'Colors collection not available', 500);
      }

      const colors = await colorsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await colorsCollection.countDocuments(filter);

      return ApiResponse.success(res, {
        colors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get colors error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get color by ID from colors collection
  static async getColorById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid color ID', 400);
      }

      const colorsCollection = getCollection('colors');
      if (!colorsCollection) {
        return ApiResponse.error(res, 'Colors collection not available', 500);
      }

      const color = await colorsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!color) {
        return ApiResponse.error(res, 'Color not found', 404);
      }

      return ApiResponse.success(res, color);
    } catch (error) {
      console.error('Get color by ID error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update color in colors collection
  static async updateColor(req, res) {
    try {
      const { id } = req.params;
      const { name, hex, rgb, families } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid color ID', 400);
      }

      const colorsCollection = getCollection('colors');
      if (!colorsCollection) {
        return ApiResponse.error(res, 'Colors collection not available', 500);
      }

      const updateData = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (hex !== undefined) updateData.hex = hex;
      if (rgb !== undefined) updateData.rgb = rgb;
      if (families !== undefined) updateData.families = families;

      const result = await colorsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Color not found', 404);
      }

      return ApiResponse.success(res, null, 'Color updated successfully');
    } catch (error) {
      console.error('Update color error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete color from colors collection
  static async deleteColor(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid color ID', 400);
      }

      const colorsCollection = getCollection('colors');
      if (!colorsCollection) {
        return ApiResponse.error(res, 'Colors collection not available', 500);
      }

      const result = await colorsCollection.deleteOne({ 
        _id: new ObjectId(id) 
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Color not found', 404);
      }

      return ApiResponse.success(res, null, 'Color deleted successfully');
    } catch (error) {
      console.error('Delete color error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get color statistics
  static async getColorStats(req, res) {
    try {
      const colorsCollection = getCollection('colors');
      const colorDataCollection = getCollection('colorData');

      if (!colorsCollection || !colorDataCollection) {
        return ApiResponse.error(res, 'Collections not available', 500);
      }

      const totalSaved = await colorsCollection.countDocuments();
      const totalAvailable = await colorDataCollection.countDocuments();
      const completeRecords = await colorsCollection.countDocuments({
        name: { $ne: '' },
        hex: { $ne: '' },
        rgb: { $ne: '' }
      });

      return ApiResponse.success(res, {
        saved: totalSaved,
        available: totalAvailable,
        complete: completeRecords,
        incomplete: totalSaved - completeRecords
      });
    } catch (error) {
      console.error('Get color stats error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = ColorController;