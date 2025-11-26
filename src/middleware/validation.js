const { body, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Product Validation
const validateProduct = [
  body('title')
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3-200 characters'),
  
  body('productCode')
    .notEmpty()
    .withMessage('Product code is required'),
  
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom(value => value >= 0)
    .withMessage('Price cannot be negative'),
  
  body('productCategory')
    .notEmpty()
    .withMessage('Product category is required'),
  
  handleValidationErrors
];

// Order Validation
const validateOrder = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),
  
  handleValidationErrors
];

// User Validation
const validateUser = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('role')
    .optional()
    .isIn(['user', 'staff', 'admin'])
    .withMessage('Invalid role'),
  
  handleValidationErrors
];

// Blog Validation
const validateBlog = [
  body('title')
    .notEmpty()
    .withMessage('Blog title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5-200 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Blog content is required')
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  
  handleValidationErrors
];

// ObjectId Validation Middleware
const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName} ID format`
    });
  }
  
  next();
};

module.exports = {
  validateProduct,
  validateOrder,
  validateUser,
  validateBlog,
  validateObjectId,
  handleValidationErrors
};