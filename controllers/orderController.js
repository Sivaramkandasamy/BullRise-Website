const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const TextileProduct = require('../models/TextileProduct');
const ProductVariant = require('../models/ProductVariant');
const StockMovement = require('../models/StockMovement');
const ExcelJS = require('exceljs');

const createOrder = asyncHandler(async (req, res) => {
  // 1. Fetch User to get default address
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // If client provided an addressId, prefer that. Otherwise use default or first address
  const { addressId, paymentMethod = 'COD' } = req.body || {};
  let selectedAddr = null;

  if (addressId) {
    selectedAddr = user.addresses.id(addressId);
  }

  if (!selectedAddr) {
    selectedAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
  }

  if (!selectedAddr) {
    res.status(400);
    throw new Error('Please add a shipping address in your profile first');
  }

  // 2. Fetch Cart
  const cart = await Cart.findOne({ user: req.user._id }).lean();

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('No items in cart');
  }

  const legacyIds = cart.items
    .filter((item) => (item.productModel || 'Product') === 'Product')
    .map((item) => item.product);
  const textileIds = cart.items
    .filter((item) => item.productModel === 'TextileProduct')
    .map((item) => item.product);

  const [legacyProducts, textileProducts] = await Promise.all([
    Product.find({ _id: { $in: legacyIds } }).lean(),
    TextileProduct.find({ _id: { $in: textileIds } }).lean()
  ]);
  const legacyMap = new Map(legacyProducts.map((product) => [String(product._id), product]));
  const textileMap = new Map(textileProducts.map((product) => [String(product._id), product]));

  const orderItems = [];
  for (const item of cart.items) {
    const isTextile = item.productModel === 'TextileProduct';
    const product = isTextile
      ? textileMap.get(String(item.product))
      : legacyMap.get(String(item.product));

    if (!product) {
      res.status(400);
      throw new Error('A cart product is no longer available');
    }

    if (isTextile) {
      const variant = await ProductVariant.findOne({
        _id: item.variant,
        productId: product._id,
        status: 'ACTIVE'
      });
      if (!variant || variant.stockAvailable < item.qty) {
        res.status(400);
        throw new Error(`${product.name} (${item.size}) does not have enough stock`);
      }
      orderItems.push({
        product: product._id,
        productModel: 'TextileProduct',
        variant: variant._id,
        name: product.name,
        qty: item.qty,
        price: variant.retailPrice,
        size: item.size,
        color: item.color,
        image: product.images?.[0]
      });
    } else {
      orderItems.push({
        product: product._id,
        productModel: 'Product',
        name: product.name,
        qty: item.qty,
        price: product.price,
        size: item.size,
        color: item.color,
        image: product.images?.[0]
      });
    }
  }

  const itemsPrice = orderItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const shippingPrice = itemsPrice > 999 ? 0 : 50;
  const taxPrice = Math.round(itemsPrice * 0.05);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // 3. Generate Custom Order ID
  // Format: ORD-YYYYMMDD-RANDOM
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  const orderId = `ORD-${dateStr}-${randomStr}`;

  // Map user address fields to order shippingAddress shape
  const shippingAddress = {
    fullName: selectedAddr.fullName,
    phone: selectedAddr.phone,
    addressLine1: selectedAddr.address,
    addressLine2: selectedAddr.locality || selectedAddr.landmark || '',
    city: selectedAddr.city,
    state: selectedAddr.state,
    pincode: selectedAddr.pincode,
    addressId: selectedAddr._id?.toString(),
    suggestedName: selectedAddr.suggestedName || ''
  };

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    orderId,
    status: 'Placed',
    isPaid: paymentMethod === 'UPI' // Simulate UPI payment as paid
  });

  for (const item of orderItems.filter((orderItem) => orderItem.productModel === 'TextileProduct')) {
    const variant = await ProductVariant.findOneAndUpdate(
      { _id: item.variant, stockAvailable: { $gte: item.qty } },
      {
        $inc: {
          stockAvailable: -item.qty
        }
      },
      { new: true }
    );
    if (!variant) {
      await order.deleteOne();
      res.status(400);
      throw new Error(`${item.name} (${item.size}) stock changed before checkout. Please try again.`);
    }
    await StockMovement.create({
      productId: item.product,
      variantId: variant._id,
      warehouseId: variant.warehouseId,
      type: 'ADJUSTMENT_OUT',
      quantity: item.qty,
      balanceAfter: variant.stockAvailable,
      note: `Order ${order.orderId}`,
      createdBy: req.user._id
    });
  }

  await Cart.findOneAndDelete({ user: req.user._id });

  res.status(201).json(order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate({
      path: 'orderItems.product',
      select: 'name images price'
    })
    .sort({ createdAt: -1 });
  res.json(orders);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { search, date, month } = req.query;
  let filter = {};

  if (search) {
    filter = {
      $or: [
        { orderId: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ]
    };
  }

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }

  if (month) {
    const [year, monthNum] = month.split('-');
    const startMonth = new Date(year, monthNum - 1, 1);
    const endMonth = new Date(year, monthNum, 1);
    filter.createdAt = { $gte: startMonth, $lt: endMonth };
  }

  const orders = await Order.find(filter).populate('user', 'name email');
  res.json(orders);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const { isPaid, isDelivered, status } = req.body;

  if (isPaid !== undefined) {
    order.isPaid = isPaid;
    order.paidAt = isPaid ? Date.now() : null;
  }

  if (isDelivered !== undefined) {
    order.isDelivered = isDelivered;
    order.deliveredAt = isDelivered ? Date.now() : null;
  }

  if (status) {
    order.status = status;
    // Auto-update isDelivered if status is Delivered
    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
  }

  const updated = await order.save();
  res.json(updated);
});

// ✅ User / admin can cancel an order with a reason
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only owner or admin can cancel
  if (
    !req.user.isAdmin &&
    order.user.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  // Prevent cancelling if already shipped / delivered / cancelled
  if (['Shipped', 'Delivered', 'Cancelled'].includes(order.status)) {
    res.status(400);
    throw new Error('Order can no longer be cancelled');
  }

  const { reason } = req.body;

  order.status = 'Cancelled';
  order.cancelReason = reason || '';
  order.cancelledAt = Date.now();

  for (const item of order.orderItems.filter(
    (orderItem) => orderItem.productModel === 'TextileProduct' && orderItem.variant
  )) {
    const variant = await ProductVariant.findByIdAndUpdate(
      item.variant,
      { $inc: { stockAvailable: item.qty } },
      { new: true }
    );
    if (variant) {
      await StockMovement.create({
        productId: item.product,
        variantId: variant._id,
        warehouseId: variant.warehouseId,
        type: 'ADJUSTMENT_IN',
        quantity: item.qty,
        balanceAfter: variant.stockAvailable,
        note: `Cancelled order ${order.orderId}`,
        createdBy: req.user._id
      });
    }
  }

  const updated = await order.save();
  res.json(updated);
});

const deleteMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  await order.deleteOne();
  res.json({ message: 'Order removed from history' });
});

// ✅ Delete entire order history for current user
const deleteMyOrderHistory = asyncHandler(async (req, res) => {
  await Order.deleteMany({ user: req.user._id });
  res.json({ message: 'Order history cleared' });
});

// ✅ Admin can delete any order
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  await order.deleteOne();
  res.json({ message: 'Order deleted successfully' });
});

// Public: Track order by public orderId (e.g., ORD-20251201-1234)
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    res.status(400);
    throw new Error('OrderId is required');
  }

  const order = await Order.findOne({ orderId })
    .populate({ path: 'orderItems.product', select: 'name images' })
    .populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Return limited tracking info
  res.json({
    orderId: order.orderId,
    status: order.status,
    isPaid: order.isPaid,
    isDelivered: order.isDelivered,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt || null,
    orderItems: order.orderItems.map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      image: it.image
    })),
    shippingAddress: order.shippingAddress,
    itemsPrice: order.itemsPrice,
    shippingPrice: order.shippingPrice,
    taxPrice: order.taxPrice,
    totalPrice: order.totalPrice,
    user: order.user ? { name: order.user.name, email: order.user.email } : null
  });
});


const downloadOrdersExcel = asyncHandler(async (req, res) => {
  const { search, date, month } = req.query;
  let filter = {};

  if (search) {
    filter = {
      $or: [
        { orderId: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ]
    };
  }

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }

  if (month) {
    const [year, monthNum] = month.split('-');
    const startMonth = new Date(year, monthNum - 1, 1);
    const endMonth = new Date(year, monthNum, 1);
    filter.createdAt = { $gte: startMonth, $lt: endMonth };
  }

  const orders = await Order.find(filter).populate('user', 'name email');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Orders');

  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 20 },
    { header: 'User Email', key: 'userEmail', width: 30 },
    { header: 'Total Price', key: 'totalPrice', width: 15 },
    { header: 'Paid', key: 'isPaid', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Placed At', key: 'createdAt', width: 20 },
    { header: 'Cancel Reason', key: 'cancelReason', width: 20 }
  ];

  orders.forEach(order => {
    worksheet.addRow({
      orderId: order.orderId,
      userEmail: order.user?.email || '',
      totalPrice: order.totalPrice,
      isPaid: order.isPaid ? 'Yes' : 'No',
      status: order.status,
      createdAt: new Date(order.createdAt).toLocaleString(),
      cancelReason: order.status === 'Cancelled' ? (order.cancelReason || '') : ''
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  trackOrder,
  cancelOrder,
  deleteMyOrder,
  deleteMyOrderHistory,
  deleteOrder,
  downloadOrdersExcel
};
