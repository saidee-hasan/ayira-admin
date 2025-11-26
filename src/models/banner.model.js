const { getDB } = require('../config/database');

class BannerModel {
  static collection() {
    return getDB().collection('banners');
  }

  static async create(bannerData) {
    return await this.collection().insertOne({
      ...bannerData,
      createdAt: new Date(),
      active: true
    });
  }

  static async findAll() {
    return await this.collection()
      .find({ active: true })
      .sort({ _id: -1 })
      .toArray();
  }

  static async findById(id) {
    return await this.collection().findOne({ _id: id });
  }

  static async updateById(id, updateData) {
    return await this.collection().updateOne(
      { _id: id },
      { $set: updateData }
    );
  }

  static async deleteById(id) {
    return await this.collection().deleteOne({ _id: id });
  }

  static async getActiveBanners() {
    return await this.collection()
      .find({ active: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
  }
}

module.exports = BannerModel;