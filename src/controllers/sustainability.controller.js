// src/controllers/sustainability.controller.js
const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

class SustainabilityController {
  // Create Sustainability Attribute
  static async createSustainability(req, res) {
    try {
      const { 
        name, 
        description, 
        type, // 'material', 'process', 'certification', 'initiative'
        impactLevel, // 'low', 'medium', 'high', 'very-high'
        co2Reduction, // in percentage
        waterSaved, // in liters
        energySaved, // in kWh
        tags = [],
        status = 'active'
      } = req.body;

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Sustainability attribute name is required', 400);
      }

      if (!type || !['material', 'process', 'certification', 'initiative'].includes(type)) {
        return ApiResponse.error(res, 'Valid type is required', 400);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      // Check if sustainability attribute already exists
      const existingAttribute = await sustainabilityCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });

      if (existingAttribute) {
        return ApiResponse.error(res, 'Sustainability attribute already exists', 409);
      }

      const sustainabilityData = {
        name: name.trim(),
        description: description?.trim() || '',
        type: type,
        impactLevel: impactLevel || 'medium',
        co2Reduction: co2Reduction || 0,
        waterSaved: waterSaved || 0,
        energySaved: energySaved || 0,
        tags: Array.isArray(tags) ? tags : [],
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await sustainabilityCollection.insertOne(sustainabilityData);

      return ApiResponse.success(
        res,
        {
          _id: result.insertedId,
          ...sustainabilityData
        },
        'Sustainability attribute created successfully',
        201
      );
    } catch (error) {
      console.error('Create sustainability error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Sustainability Attributes
  static async getSustainabilityAttributes(req, res) {
    try {
      const { 
        type, 
        status, 
        impactLevel,
        page = 1, 
        limit = 50, 
        search 
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      let filter = {};
      
      // Type filter
      if (type && type !== 'all') {
        filter.type = type;
      }

      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Impact level filter
      if (impactLevel && impactLevel !== 'all') {
        filter.impactLevel = impactLevel;
      }

      // Search filter
      if (search && search.trim() !== '') {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const sustainabilityAttributes = await sustainabilityCollection
        .find(filter)
        .sort({ impactLevel: -1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await sustainabilityCollection.countDocuments(filter);

      // Get stats
      const stats = await sustainabilityCollection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalCO2Reduction: { $sum: '$co2Reduction' },
            totalWaterSaved: { $sum: '$waterSaved' },
            totalEnergySaved: { $sum: '$energySaved' },
            byType: {
              $push: {
                type: '$type',
                impact: '$impactLevel',
                co2: '$co2Reduction',
                water: '$waterSaved',
                energy: '$energySaved'
              }
            }
          }
        }
      ]).toArray();

      const typeStats = await sustainabilityCollection.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalCO2: { $sum: '$co2Reduction' },
            totalWater: { $sum: '$waterSaved' },
            totalEnergy: { $sum: '$energySaved' }
          }
        }
      ]).toArray();

      return ApiResponse.success(res, {
        sustainabilityAttributes,
        stats: stats[0] || { total: 0, totalCO2Reduction: 0, totalWaterSaved: 0, totalEnergySaved: 0 },
        typeStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get sustainability attributes error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Sustainability Attribute by ID
  static async getSustainabilityById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sustainability attribute ID', 400);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      const sustainability = await sustainabilityCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!sustainability) {
        return ApiResponse.error(res, 'Sustainability attribute not found', 404);
      }

      return ApiResponse.success(res, sustainability);
    } catch (error) {
      console.error('Get sustainability by ID error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update Sustainability Attribute
  static async updateSustainability(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        type, 
        impactLevel, 
        co2Reduction, 
        waterSaved, 
        energySaved, 
        tags, 
        status 
      } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sustainability attribute ID', 400);
      }

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Sustainability attribute name is required', 400);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      // Check if sustainability attribute with same name already exists
      const existingAttribute = await sustainabilityCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingAttribute) {
        return ApiResponse.error(res, 'Sustainability attribute with this name already exists', 409);
      }

      const updateData = {
        name: name.trim(),
        description: description?.trim() || '',
        type: type,
        impactLevel: impactLevel || 'medium',
        co2Reduction: co2Reduction || 0,
        waterSaved: waterSaved || 0,
        energySaved: energySaved || 0,
        tags: Array.isArray(tags) ? tags : [],
        status: status || 'active',
        updatedAt: new Date()
      };

      const result = await sustainabilityCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Sustainability attribute not found', 404);
      }

      return ApiResponse.success(res, null, 'Sustainability attribute updated successfully');
    } catch (error) {
      console.error('Update sustainability error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Sustainability Attribute
  static async deleteSustainability(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sustainability attribute ID', 400);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      const result = await sustainabilityCollection.deleteOne({
        _id: new ObjectId(id)
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Sustainability attribute not found', 404);
      }

      return ApiResponse.success(res, null, 'Sustainability attribute deleted successfully');
    } catch (error) {
      console.error('Delete sustainability error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Toggle Sustainability Status
  static async toggleSustainabilityStatus(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid sustainability attribute ID', 400);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      const currentAttribute = await sustainabilityCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!currentAttribute) {
        return ApiResponse.error(res, 'Sustainability attribute not found', 404);
      }

      const newStatus = currentAttribute.status === 'active' ? 'inactive' : 'active';

      const result = await sustainabilityCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: newStatus,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Sustainability attribute not found', 404);
      }

      return ApiResponse.success(res, { newStatus }, `Sustainability attribute ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Toggle sustainability status error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Search Sustainability Attributes
  static async searchSustainability(req, res) {
    try {
      const { q, type, impactLevel } = req.query;

      if (!q || q.trim() === '') {
        return ApiResponse.success(res, []);
      }

      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      let filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q, 'i')] } }
        ]
      };

      if (type && type !== 'all') {
        filter.type = type;
      }

      if (impactLevel && impactLevel !== 'all') {
        filter.impactLevel = impactLevel;
      }

      const sustainabilityAttributes = await sustainabilityCollection
        .find(filter)
        .limit(10)
        .toArray();

      return ApiResponse.success(res, sustainabilityAttributes);
    } catch (error) {
      console.error('Search sustainability error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Sustainability Stats
  static async getSustainabilityStats(req, res) {
    try {
      const sustainabilityCollection = getCollection('sustainability');
      if (!sustainabilityCollection) {
        return ApiResponse.error(res, 'Sustainability collection not available', 500);
      }

      const stats = await sustainabilityCollection.aggregate([
        {
          $group: {
            _id: null,
            totalAttributes: { $sum: 1 },
            activeAttributes: { 
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
            },
            totalCO2Reduction: { $sum: '$co2Reduction' },
            totalWaterSaved: { $sum: '$waterSaved' },
            totalEnergySaved: { $sum: '$energySaved' },
            byType: {
              $push: {
                type: '$type',
                impact: '$impactLevel'
              }
            }
          }
        }
      ]).toArray();

      const impactDistribution = await sustainabilityCollection.aggregate([
        {
          $group: {
            _id: '$impactLevel',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const typeDistribution = await sustainabilityCollection.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      return ApiResponse.success(res, {
        overview: stats[0] || { totalAttributes: 0, activeAttributes: 0, totalCO2Reduction: 0, totalWaterSaved: 0, totalEnergySaved: 0 },
        impactDistribution,
        typeDistribution
      });
    } catch (error) {
      console.error('Get sustainability stats error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = SustainabilityController;