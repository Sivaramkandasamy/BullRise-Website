const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { generateOtp, verifyOtp } = require('../utils/sendOtp');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation rules
const validateRegister = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').exists().withMessage('Password is required'),
];


// Register
const registerUser = [
  
  ...validateRegister,
  asyncHandler(async (req, res) => {

    console.log("REGISTER USER");
    console.log(req.body);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });

    if (existing) {
      res.status(400);
      throw new Error("User already exists");
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      isAdmin: false,
    });

    const token = generateToken(res, user._id, user.isAdmin);

  res.status(201).json({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  role: user.role,
  token
});
  }),
];
// Email/password login
const authUser = [
  ...validateLogin,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(res, user._id, user.isAdmin);
     res.json({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  role: user.role,
  token
});
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  })
];

// Google login (frontend sends Google ID token)
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar: picture
    });
  }

  const token = generateToken(res, user._id, user.isAdmin);

res.json({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  role: user.role,
  token
});
});

// Request OTP for phone login
// Request OTP for phone login
const requestOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    res.status(400);
    throw new Error('Valid 10-digit phone is required');
  }

  await generateOtp(phone); // now async — await is required
  res.json({ success: true, message: 'OTP sent' }); // 👈 no devOtp!
});
// Verify OTP and login
const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!verifyOtp(phone, otp)) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      name: `User-${phone.slice(-4)}`,
      email: `${phone}@metromenswear-otp.local`,
      phone
    });
  }

  const token = generateToken(res, user._id, user.isAdmin);
res.json({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  role: user.role,
  token
});
});

// Logout
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.json({ message: 'Logged out' });
});

// Get profile
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json(user);
});

// Update profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  user.name = req.body.name || user.name;
  user.phone = req.body.phone || user.phone;

  if (req.body.password) user.password = req.body.password;

  const updated = await user.save();

  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    isAdmin: updated.isAdmin
  });
});

const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const exists = await User.findOne({ email });

  if (exists) {
    res.status(400);
    throw new Error("Admin already exists");
  }

  const admin = await User.create({
    name,
    email,
    password,
    phone,
    isAdmin: true,
  });

  const token = generateToken(res, admin._id, admin.isAdmin);

res.status(201).json({
  _id: admin._id,
  name: admin.name,
  email: admin.email,
  phone: admin.phone,
  isAdmin: admin.isAdmin,
  isSuperAdmin: admin.isSuperAdmin,
  role: admin.role,
  token
});
});

module.exports = {
  registerUser,
  registerAdmin,
  authUser,
  googleLogin,
  requestOtp,
  verifyPhoneOtp,
  logoutUser,
  getProfile,
  updateProfile,
};
