// backend/controllers/productController.js
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Category = require('../models/Category');

const validateProductCategory = async (payload) => {
  const categoryId = payload.category;

  if (!categoryId) {
    return { valid: false, message: 'Category is required' };
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return { valid: false, message: 'Selected category does not exist' };
  }

  const allowedSubCategories = category.subCategories || [];
  const subCategory = typeof payload.subCategory === 'string'
    ? payload.subCategory.trim()
    : '';

  if (allowedSubCategories.length > 0) {
    if (!subCategory) {
      return { valid: false, message: 'Sub category is required' };
    }

    const isAllowed = allowedSubCategories.includes(subCategory);

    if (!isAllowed) {
      return {
        valid: false,
        message: 'Selected sub category does not belong to the selected category'
      };
    }
  }

  return { valid: true, category, subCategory };
};

// --------------------------------------
// GET ALL PRODUCTS (with filters and pagination)
// --------------------------------------
const getProducts = asyncHandler(async (req, res) => {
  const {
    category: categorySlug,
    subCategory,
    new: isNew,
    bestseller,
    trending,
    search,
  } = req.query;

  const filter = {};

  // category filter (slug)
  if (categorySlug) {
    const slug = String(categorySlug).toLowerCase();
    const cat = await Category.findOne({ slug });

    if (!cat) {
      return res.json({ products: [], totalPages: 0, currentPage: 1 }); // avoid 500 crash
    }

    filter.category = cat._id;
  }

  if (subCategory) {
    const subCategories = String(subCategory)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (subCategories.length === 1) {
      filter.subCategory = subCategories[0];
    } else if (subCategories.length > 1) {
      filter.subCategory = { $in: subCategories };
    }
  }

  // Convert string 'true' to boolean check
  if (isNew === 'true') filter.isNewArrival = true;
  if (bestseller === 'true') {
    filter.isBestSeller = true;
    filter.isTrending = false;
    filter.isNewArrival = false;
  }
  if (trending === 'true') {
    filter.isTrending = true;
    filter.isBestSeller = false;
    filter.isNewArrival = false;
  }

  // search filter (case-insensitive, match any substring)
  if (search) {
    filter.name = { $regex: search.trim(), $options: 'i' };
  }

  // Debug log
  console.log('Product filter:', filter);

  const totalProducts = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .populate('category')
    .sort({ createdAt: -1 });

  console.log('Products found:', products.length);

  res.json({
    products,
    totalProducts
  });
});

// --------------------------------------
// GET PRODUCT BY ID
// --------------------------------------
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json(product);
});

// --------------------------------------
// CREATE PRODUCT
// --------------------------------------
const createProduct = asyncHandler(async (req, res) => {
  const validation = await validateProductCategory(req.body);

  if (!validation.valid) {
    res.status(400);
    throw new Error(validation.message);
  }

  const product = await Product.create({
    ...req.body,
    category: validation.category._id,
    subCategory: validation.subCategory
  });
  res.status(201).json(product);
});

// --------------------------------------
// UPDATE PRODUCT
// --------------------------------------
const updateProduct = asyncHandler(async (req, res) => {
  const validation = await validateProductCategory(req.body);

  if (!validation.valid) {
    res.status(400);
    throw new Error(validation.message);
  }

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      category: validation.category._id,
      subCategory: validation.subCategory
    },
    { new: true }
  );

  if (!updated) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json(updated);
});

// --------------------------------------
// DELETE PRODUCT
// --------------------------------------
const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);

  if (!deleted) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({ message: 'Product deleted successfully' });
});

// --------------------------------------
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
