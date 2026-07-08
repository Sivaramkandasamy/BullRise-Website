const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');
// ⚠️ Adjust this path/name if your textile model is registered differently —
// confirmed correct against textileController.js
const TextileProduct = require('../models/TextileProduct');
const ProductVariant = require('../models/ProductVariant');

// A product can live in either catalog. Look it up in both rather than
// assuming everything is a legacy Product — that assumption is exactly
// what was causing "Product not found" for every textile item.
//
// For textile products, this also attaches a `variants` array — the same
// shape getStorefrontTextileProduct returns (sku, size, stockAvailable,
// retailPrice, mrp, gst). ProductCard.jsx already falls back to
// `firstVariant?.retailPrice` / `firstVariant?.mrp` when the product itself
// has no top-level price — that fallback just had nothing to read from
// before, since variants were never attached here.
const findAnyProduct = async (productId) => {
  const legacy = await Product.findById(productId).lean();
  if (legacy) return { doc: legacy, catalogType: 'legacy' };

  const textile = await TextileProduct.findOne({
    _id: productId,
    status: { $ne: 'DELETED' }
  }).lean();

  if (textile) {
    const variants = await ProductVariant.find({
      productId: textile._id,
      status: { $ne: 'DELETED' }
    })
      .select('sku size stockAvailable retailPrice mrp gst')
      .sort({ size: 1 })
      .lean();

    return { doc: { ...textile, variants }, catalogType: 'textile' };
  }

  return null;
};

// Resolve a user's raw wishlist ObjectIds into full product objects,
// checking both catalogs for each one. Silently drops any id that no
// longer exists in either catalog (e.g. the product was later deleted).
const resolveWishlist = async (ids = []) => {
  const results = await Promise.all(
    ids.map(async (id) => {
      const found = await findAnyProduct(id);
      return found ? { ...found.doc, catalogType: found.catalogType } : null;
    })
  );
  return results.filter(Boolean);
};

// GET /api/wishlist
// Returns an array of populated product objects (from either catalog)
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const wishlist = await resolveWishlist(user?.wishlist || []);
  res.json(wishlist);
});

// POST /api/wishlist  { productId }
// Adds product to wishlist (no duplicates) and returns updated wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error('productId is required');
  }

  const found = await findAnyProduct(productId);
  if (!found) {
    res.status(404);
    throw new Error('Product not found');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.wishlist) user.wishlist = [];

  const alreadyThere = user.wishlist.some(
    (id) => id.toString() === productId
  );

  if (!alreadyThere) {
    user.wishlist.push(productId);
  }

  await user.save();

  const updated = await User.findById(req.user._id);
  const wishlist = await resolveWishlist(updated?.wishlist || []);
  res.json(wishlist);
});

// DELETE /api/wishlist/:productId
// Removes a product from the wishlist and returns updated wishlist
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.wishlist = (user.wishlist || []).filter(
    (id) => id.toString() !== productId
  );

  await user.save();

  const updated = await User.findById(req.user._id);
  const wishlist = await resolveWishlist(updated?.wishlist || []);
  res.json(wishlist);
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};