const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryService } = require('../config/cloudinary');
const { FILE_LIMITS } = require('../config/constants');

// Ensure upload directories exist
const createUploadDirs = () => {
  const directories = [
    'uploads/temp',
    'uploads/products',
    'uploads/blogs', 
    'uploads/banners',
    'uploads/orders',
    'uploads/size_charts',
    'uploads/pdfs'
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Local storage for PDFs and temporary files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/temp';
    
    if (file.mimetype === 'application/pdf') {
      folder = 'uploads/pdfs';
    } else if (file.fieldname.includes('product')) {
      folder = 'uploads/products';
    } else if (file.fieldname.includes('blog')) {
      folder = 'uploads/blogs';
    } else if (file.fieldname.includes('banner')) {
      folder = 'uploads/banners';
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filters
const imageFilter = (req, file, cb) => {
  if (FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP) are allowed!'), false);
  }
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const mixedFilter = (req, file, cb) => {
  const allowedTypes = [...FILE_LIMITS.ALLOWED_IMAGE_TYPES, 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed!'), false);
  }
};

// Multer instances
const upload = multer({
  storage: storage,
  fileFilter: mixedFilter,
  limits: { fileSize: FILE_LIMITS.MAX_FILE_SIZE }
});

const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_LIMITS.MAX_FILE_SIZE }
});

const uploadPDF = multer({
  storage: storage,
  fileFilter: pdfFilter,
  limits: { fileSize: FILE_LIMITS.MAX_FILE_SIZE }
});

const uploadProduct = multer({
  storage: storage,
  fileFilter: mixedFilter,
  limits: { 
    fileSize: FILE_LIMITS.MAX_FILE_SIZE,
    files: 15 // Maximum number of files
  }
});

const uploadBanner = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_LIMITS.MAX_FILE_SIZE }
});

// Enhanced upload middleware that handles both single and multiple files
const handleCloudinaryUpload = (fieldConfigs) => {
  return async (req, res, next) => {
    try {
      req.cloudinaryResults = [];
      
      for (const config of fieldConfigs) {
        const { fieldName, resourceType = 'image', isMultiple = false } = config;
        
        if (isMultiple && req.files && req.files[fieldName]) {
          // Handle multiple files
          const files = req.files[fieldName];
          const folder = `ayira-ecommerce/${resourceType === 'raw' ? 'pdfs' : 'images'}`;
          
          const uploadPromises = files.map(file => {
            if (resourceType === 'raw') {
              return CloudinaryService.uploadPDF(file.path, folder);
            } else {
              return CloudinaryService.uploadImage(file.path, folder);
            }
          });

          const results = await Promise.all(uploadPromises);
          
          // Add fieldname to each result
          results.forEach(result => {
            result.fieldname = fieldName;
            req.cloudinaryResults.push(result);
          });
          
          // Delete local files
          files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
          
        } else if (!isMultiple && req.files && req.files[fieldName]) {
          // Handle single file from files object
          const file = req.files[fieldName][0];
          const folder = `ayira-ecommerce/${resourceType === 'raw' ? 'pdfs' : 'images'}`;
          let result;
          
          if (resourceType === 'raw') {
            result = await CloudinaryService.uploadPDF(file.path, folder);
          } else {
            result = await CloudinaryService.uploadImage(file.path, folder);
          }
          
          result.fieldname = fieldName;
          req.cloudinaryResults.push(result);
          
          // Delete local file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
      
      next();
    } catch (error) {
      // Cleanup any uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      next(error);
    }
  };
};

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field.'
      });
    }
  }
  
  if (error.message.includes('Only')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  upload,
  uploadImage,
  uploadPDF,
  uploadProduct,
  uploadBanner,
  handleCloudinaryUpload,
  handleMulterError,
  createUploadDirs
};