const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

const bannersCollection = () => getCollection('banners');

class BannerController {
  // Create Banner
  static async createBanner(req, res) {
    try {
      const bannerData = {
        ...req.body,
        createdAt: new Date()
      };

      if (req.file) {
        bannerData.image = `/uploads/banners/${req.file.filename}`;
      }

      const result = await bannersCollection().insertOne(bannerData);

      return ApiResponse.success(
        res,
        { bannerId: result.insertedId, ...bannerData },
        'Banner created successfully',
        201
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Banners
  static async getBanners(req, res) {
    try {
      const banners = await bannersCollection()
        .find()
        .sort({ _id: -1 })
        .toArray();

      return ApiResponse.success(res, banners);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Banner
  static async deleteBanner(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid banner ID', 400);
      }

      const result = await bannersCollection().deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Banner not found', 404);
      }

      return ApiResponse.success(res, null, 'Banner deleted successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = BannerController;