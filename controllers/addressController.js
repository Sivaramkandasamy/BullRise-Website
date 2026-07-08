const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// GET /api/addresses  -> list all addresses of current user
const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user.addresses || []);
});

// POST /api/addresses  -> create new address
const createAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr = req.body;

  // if this address is default, unset all others
  if (addr.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses.push(addr);
  await user.save();
  res.status(201).json(user.addresses);
});

// PUT /api/addresses/:id  -> update existing address
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr = user.addresses.id(id);
  if (!addr) {
    res.status(404);
    throw new Error('Address not found');
  }

  const updatedData = req.body;

  // handle default flag
  if (updatedData.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  Object.assign(addr, updatedData);

  await user.save();
  res.json(user.addresses);
});

// DELETE /api/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr = user.addresses.id(id);
  if (!addr) {
    res.status(404);
    throw new Error('Address not found');
  }

  addr.deleteOne();
  await user.save();
  res.json(user.addresses);
});

// PUT /api/addresses/:id/default  -> set as default address
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr = user.addresses.id(id);
  if (!addr) {
    res.status(404);
    throw new Error('Address not found');
  }

  // Unset all other addresses' default flag
  user.addresses.forEach((a) => {
    a.isDefault = false;
  });

  // Set this one as default
  addr.isDefault = true;

  await user.save();
  res.json(user.addresses);
});

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
