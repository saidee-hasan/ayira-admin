const cloudinary = require('cloudinary').v2;


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary upload utility functions
class CloudinaryService {
  // Upload image to Cloudinary
  static async uploadImage(filePath, folder = 'ayira-ecommerce') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
      });
      return result;
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  // Upload PDF to Cloudinary
  static async uploadPDF(filePath, folder = 'ayira-ecommerce/pdfs') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'raw', // PDFs are treated as raw files
        format: 'pdf'
      });
      return result;
    } catch (error) {
      throw new Error(`Cloudinary PDF upload failed: ${error.message}`);
    }
  }

  // Delete file from Cloudinary
  static async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      return result;
    } catch (error) {
      throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
  }

  // Upload multiple images
  static async uploadMultipleImages(files, folder = 'ayira-ecommerce') {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file.path, folder)
      );
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      throw new Error(`Multiple image upload failed: ${error.message}`);
    }
  }

  // Get Cloudinary URL with transformations
  static getOptimizedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: 'auto',
      fetch_format: 'auto'
    };

    const mergedTransformations = { ...defaultTransformations, ...transformations };
    
    return cloudinary.url(publicId, {
      ...mergedTransformations,
      secure: true
    });
  }
}

module.exports = { cloudinary, CloudinaryService };