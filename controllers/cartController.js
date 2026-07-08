const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const TextileProduct = require('../models/TextileProduct');
const ProductVariant = require('../models/ProductVariant');

const populateCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).lean();

  if (!cart) return { user: userId, items: [] };

  const legacyIds = cart.items
    .filter((item) => (item.productModel || 'Product') === 'Product')
    .map((item) => item.product);
  const textileIds = cart.items
    .filter((item) => item.productModel === 'TextileProduct')
    .map((item) => item.product);
  const variantIds = cart.items.map((item) => item.variant).filter(Boolean);

  const [legacyProducts, textileProducts, variants] = await Promise.all([
    Product.find({ _id: { $in: legacyIds } }).populate('category').lean(),
    TextileProduct.find({ _id: { $in: textileIds } }).lean(),
    ProductVariant.find({ _id: { $in: variantIds } }).lean()
  ]);

  const legacyMap = new Map(legacyProducts.map((product) => [String(product._id), product]));
  const textileMap = new Map(textileProducts.map((product) => [String(product._id), product]));
  const variantMap = new Map(variants.map((variant) => [String(variant._id), variant]));

  return {
    ...cart,
    items: cart.items
      .map((item) => {
        const isTextile = item.productModel === 'TextileProduct';
        const product = isTextile
          ? textileMap.get(String(item.product))
          : legacyMap.get(String(item.product));
        if (!product) return null;

        if (!isTextile) return { ...item, product };

        const variant = variantMap.get(String(item.variant));
        return {
          ...item,
          variant,
          product: {
            ...product,
            price: variant?.retailPrice || 0,
            mrp: variant?.mrp || 0,
            stock: variant?.stockAvailable || 0,
            sizes: variant?.size ? [variant.size] : [],
            colors: product.colors?.length
              ? product.colors
              : [product.color].filter(Boolean),
            category: { name: product.category },
            catalogType: 'textile'
          }
        };
      })
      .filter(Boolean)
  };
};

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  res.json(await populateCart(req.user._id));
});

// POST /api/cart  (add to cart)
const addToCart = asyncHandler(async (req, res) => {
  const { productId, qty, size, color, catalogType } = req.body;
  const isTextile = catalogType === 'textile';
  const product = isTextile
    ? await TextileProduct.findOne({ _id: productId, status: 'ACTIVE' })
    : await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  let variant = null;
  if (isTextile) {
    variant = await ProductVariant.findOne({
      productId,
      size,
      status: 'ACTIVE'
    });
    if (!variant) {
      res.status(404);
      throw new Error('Selected size is not available');
    }
    if (variant.stockAvailable < Number(qty)) {
      res.status(400);
      throw new Error('Requested quantity is not available');
    }
    const allowedColors = product.colors?.length ? product.colors : [product.color];
    if (!allowedColors.includes(color)) {
      res.status(400);
      throw new Error('Selected color is not available');
    }
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingIndex = cart.items.findIndex(
    (i) =>
      i.product.toString() === productId &&
      (i.productModel || 'Product') === (isTextile ? 'TextileProduct' : 'Product') &&
      i.size === size &&
      i.color === color
  );

  if (existingIndex > -1) {
    const nextQty = cart.items[existingIndex].qty + Number(qty);
    if (variant && nextQty > variant.stockAvailable) {
      res.status(400);
      throw new Error('Requested quantity is not available');
    }
    cart.items[existingIndex].qty = nextQty;
  } else {
    cart.items.push({
      product: productId,
      productModel: isTextile ? 'TextileProduct' : 'Product',
      variant: variant?._id,
      qty,
      size,
      color
    });
  }

  await cart.save();

  // ✅ Return populated cart so frontend has full product info
  res.json(await populateCart(req.user._id));
});

// PUT /api/cart  (update qty for one item)
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, size, color, qty } = req.body;
  const userId = req.user._id;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  const item = cart.items.find(
    (i) =>
      i.product.toString() === productId &&
      i.size === size &&
      i.color === color
  );

  if (!item) {
    return res.status(404).json({ message: 'Item not found in cart' });
  }

  // If qty <= 0, remove the item instead of keeping invalid qty
  if (qty <= 0) {
    cart.items = cart.items.filter(
      (i) =>
        !(
          i.product.toString() === productId &&
          i.size === size &&
          i.color === color
        )
    );
  } else {
    if (item.productModel === 'TextileProduct' && item.variant) {
      const variant = await ProductVariant.findById(item.variant);
      if (!variant || qty > variant.stockAvailable) {
        res.status(400);
        throw new Error('Requested quantity is not available');
      }
    }
    item.qty = qty;
  }

  await cart.save();

  res.json(await populateCart(userId));
});

// DELETE /api/cart  (remove single item)
const removeFromCart = asyncHandler(async (req, res) => {
  // Expecting productId, size, color in body (from axios delete data)
  const { productId, size, color } = req.body;
  const userId = req.user._id;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  cart.items = cart.items.filter(
    (i) =>
      !(
        i.product.toString() === productId &&
        i.size === size &&
        i.color === color
      )
  );

  await cart.save();

  res.json(await populateCart(userId));
});

// Optional: clear whole cart (not currently used by routes)
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.json({ message: 'Cart cleared' });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
