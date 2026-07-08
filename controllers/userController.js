const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// GET /api/users/me  (current user profile)
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

// PUT /api/users/me  (update current user profile)
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, mobile, gender, dateOfBirth, whatsappOptIn } = req.body;

  if (name !== undefined) user.name = name;
  if (mobile !== undefined) user.mobile = mobile;
  if (gender !== undefined) user.gender = gender;
  if (dateOfBirth !== undefined) {
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
  }
  if (whatsappOptIn !== undefined) user.whatsappOptIn = whatsappOptIn;

  // you can also allow email change, but be careful with uniqueness
  // if (email !== undefined) user.email = email;

  const updated = await user.save();
  const sanitized = updated.toObject();
  delete sanitized.password;

  res.json(sanitized);
});

const getUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;

  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  if (role === "admin") {
    filter.isAdmin = true;
  }

  if (role === "user") {
    filter.isAdmin = false;
  }

  const users = await User.find(filter).select("-password");

  res.json(users);
});

module.exports = {
  // ... your existing exports
  getMe,
  updateMe,
  getUsers
};
