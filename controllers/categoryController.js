// backend/controllers/categoryController.js
const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

// Default storefront categories and their admin/product subcategories.
const DEFAULT_CATEGORIES = [
  {
    name: 'Shirt',
    slug: 'shirt',
    description: 'Shirt',
    subCategories: [
      'Casual',
      'Formal',
      'Checked',
      'Printed',
      'Solid',
      'Linen',
      'Denim',
      'Cotton',
      'FullSleeve',
      'HalfSleeve',
      'SlimFit',
      'RegularFit',
      'PartyWear',
      'RelaxedFit',
      'Luxe',
      'Black',
      'PlusSize',
      'CoreLabCollection',
      'Festive Wear'
    ]
  },
  {
    name: 'T-SHIRTS',
    slug: 't-shirts',
    description: 'T-SHIRTS',
    subCategories: [
      'RoundNeck',
      'Polo',
      'V-Neck',
      'Oversized',
      'Graphic',
      'Printed',
      'Plain',
      'Striped',
      'FullSleeve',
      'Sports',
      'Gym',
      'SlimFit',
      'RegularFit',
      'RelaxedFit',
      'Luxe',
      'Core Lab',
      'PartyWear',
      'PlusSize',
      'Tech'
    ]
  },
  {
    name: 'JEANS',
    slug: 'jeans',
    description: 'JEANS',
    subCategories: [
      'SkinnyFit',
      'SlimFit',
      'RegularFit',
      'Straight Fit',
      'RelaxedFit',
      'Distressed',
      'Washed',
      'Stretch',
      'Ripped',
      'Cargo',
      'Black',
      'CoreLab',
      'PartyWear',
      'PlusSize',
      'BalloonFit'
    ]
  },
  {
    name: 'TROUSERS',
    slug: 'trousers',
    description: 'TROUSERS',
    subCategories: [
      'Formal',
      'Casual',
      'SlimFit',
      'RegularFit',
      'Chinos',
      'Pleated',
      'Stretch',
      'Cotton',
      'Linen',
      'Gurkha',
      'Korean',
      'PlusSize',
      'CoreLab',
      'Black',
      'Luxe'
    ]
  },
  {
    name: 'CARGO PANTS',
    slug: 'cargo-pants',
    description: 'CARGO PANTS',
    subCategories: [
      'Classic Cargo',
      'SlimFitCargo',
      'RelaxedFit Cargo',
      'JoggerCargo',
      'Tactical Cargo',
      'CottonCargo',
      'StretchCargo',
      'Multi-Pocket Cargo',
      'Parachute',
      'Corduroy',
      'Denim',
      'Baggy'
    ]
  },
  {
    name: 'OVERSHIRTS',
    slug: 'overshirts',
    description: 'OVERSHIRTS',
    subCategories: [
      'Cotton',
      'Denim',
      'Checked',
      'Solid',
      'Flannel',
      'Utility',
      'Lightweight',
      'Heavyweight',
      'Plain',
      'Prints',
      'Corduroy'
    ]
  },
  {
    name: 'PLUS SIZE',
    slug: 'plus-size',
    description: 'PLUS SIZE',
    subCategories: [
      'PlusSizeShirts',
      'PlusSize',
      'PlusSizeCargo',
      'PlusSizeCasual Wear',
      'PlusSizeFormal Wear',
      'Slim',
      'Oversize',
      'Regular',
      'Relaxed'
    ]
  },
  {
    name: 'SHORTS',
    slug: 'shorts',
    description: 'SHORTS',
    subCategories: [
      'Denim',
      'Cotton',
      'Cargo',
      'Chino',
      'Sports',
      'Gym',
      'Printed',
      'Solid',
      'Lounge',
      'Beach',
      'Relaxed',
      'Linen',
      'Black',
      'Plain',
      'Baggy',
      'Holiday'
    ]
  }
];

// GET /api/categories
// Upsert defaults so the storefront/admin navigation stays in sync.
const getCategories = asyncHandler(async (req, res) => {
  const defaultSlugs = DEFAULT_CATEGORIES.map((category) => category.slug);

  for (const category of DEFAULT_CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Category.deleteMany({ slug: { $nin: defaultSlugs } });

  const categories = await Category.find({ slug: { $in: defaultSlugs } });
  categories.sort((a, b) => {
    const aIndex = defaultSlugs.indexOf(a.slug);
    const bIndex = defaultSlugs.indexOf(b.slug);
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  res.json(categories);
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

// PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) {
    res.status(404);
    throw new Error('Category not found');
  }
  Object.assign(cat, req.body);
  const updated = await cat.save();
  res.json(updated);
});

// DELETE /api/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) {
    res.status(404);
    throw new Error('Category not found');
  }
  await cat.deleteOne();
  res.json({ message: 'Category removed' });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
