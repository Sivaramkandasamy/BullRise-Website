const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Order = require('../models/Order');

// The five roles the admin panel supports. 'superadmin' and everything else
// in ADMIN_TIER_ROLES both set isAdmin=true (so existing route protection
// and the Header's user?.isAdmin check keep working unchanged) — only
// 'superadmin' also sets isSuperAdmin=true, which is what actually gates
// creating/deleting admins elsewhere in this controller.
const ADMIN_TIER_ROLES = ['admin', 'sales', 'staff', 'reporting_manager', 'superadmin'];
const VALID_ROLES = ['user', ...ADMIN_TIER_ROLES];

const deriveFlagsFromRole = (role) => ({
  isAdmin: ADMIN_TIER_ROLES.includes(role),
  isSuperAdmin: role === 'superadmin'
});

const getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let filter = {};

  if (search) {
    filter = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }

  const users = await User.find(filter).select('-password');
  res.json(users);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // New: role-based update. Changing to/from 'superadmin' specifically
  // requires the requester to already be a super admin — same gate as
  // before, just keyed off the role string now instead of a raw boolean.
  if (req.body.role !== undefined) {
    if (!VALID_ROLES.includes(req.body.role)) {
      res.status(400);
      throw new Error('Invalid role');
    }

    const changingSuperAdminStatus =
      req.body.role === 'superadmin' || user.role === 'superadmin';

    if (changingSuperAdminStatus && !req.user?.isSuperAdmin) {
      res.status(403);
      throw new Error('Only super admins can change super admin status');
    }

    user.role = req.body.role;
    const flags = deriveFlagsFromRole(req.body.role);
    user.isAdmin = flags.isAdmin;
    user.isSuperAdmin = flags.isSuperAdmin;
  }

  // Kept for backward compatibility with the existing "Remove Admin" button,
  // which still just toggles isAdmin directly rather than picking a role.
  if (req.body.isAdmin !== undefined && req.body.role === undefined) {
    user.isAdmin = req.body.isAdmin;
    if (!req.body.isAdmin) {
      user.role = 'user';
      user.isSuperAdmin = false;
    }
  }

  const updated = await user.save();
  res.json(updated);
});

// POST /admin/users
// Creates a new admin-tier account directly (any role in ADMIN_TIER_ROLES).
// Restricted to super admins — letting any admin mint new admins (of any
// role, including more super admins) would undermine the point of
// restricting deletion to super admins below.
//
// ⚠️ Assumes your User model hashes the password itself via a pre('save')
// hook, matching how updateUserRole/deleteUser never touch bcrypt directly.
// If your model does NOT hash on save, this will store the password in
// plain text — let me know and I'll add explicit hashing here instead.
const createAdminUser = asyncHandler(async (req, res) => {
  if (!req.user?.isSuperAdmin) {
    res.status(403);
    throw new Error('Only super admins can create new admins');
  }

  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400);
    throw new Error('Name, email, and password are required');
  }

  if (!ADMIN_TIER_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Role must be one of: ${ADMIN_TIER_ROLES.join(', ')}`);
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const flags = deriveFlagsFromRole(role);

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    isAdmin: flags.isAdmin,
    isSuperAdmin: flags.isSuperAdmin
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Deleting a regular (non-admin) customer stays unrestricted.
  // Deleting an admin requires the requester to be a super admin, and
  // super admin accounts themselves can't be deleted from this endpoint
  // at all. This is the actual enforcement — the frontend only hides/
  // disables the button for UX, which anyone could bypass by calling
  // this endpoint directly.
  if (user.isAdmin) {
    if (!req.user?.isSuperAdmin) {
      res.status(403);
      throw new Error('Only super admins can delete admin accounts');
    }
    if (user.isSuperAdmin) {
      res.status(403);
      throw new Error('Super admin accounts cannot be deleted');
    }
  }

  await user.deleteOne();
  res.json({ message: 'User removed' });
});

// Enhanced dashboard stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();
  const paidOrders = await Order.find({ isPaid: true });
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Order status distribution
  const orderStatuses = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Recent orders (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const revenueByMonth = await Order.aggregate([
    { $match: { isPaid: true, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$totalPrice' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Top products by sales
  const topProducts = await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        totalSold: { $sum: '$orderItems.qty' },
        revenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        totalSold: 1,
        revenue: 1
      }
    }
  ]);

  res.json({
    totalUsers,
    totalOrders,
    totalRevenue,
    recentOrders,
    orderStatuses,
    revenueByMonth,
    topProducts
  });
});


const makeSuperAdmin = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    email: "superadmin@gmail.com",
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isAdmin = true;
  user.isSuperAdmin = true;
  user.role = "superadmin";

  await user.save();

  res.json({
    message: "Super Admin Created",
    user,
  });
});
module.exports = {
  getUsers,
  updateUserRole,
  createAdminUser,
  deleteUser,
  getDashboardStats,
  ADMIN_TIER_ROLES,
  VALID_ROLES,
  makeSuperAdmin
};