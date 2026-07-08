const express = require('express');
const {
  registerUser,
  registerAdmin,
  authUser,
  googleLogin,
  requestOtp,
  verifyPhoneOtp,
  logoutUser,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const { protect, adminOnly } = require('../middleware/authMiddleware');
const { requestOtpLimiter, verifyOtpLimiter } = require('../middleware/otpRateLimiter');

const router = express.Router();

// User Register
router.post('/register', registerUser);

// Admin Register (Only Admin can create another Admin)
router.post(
  '/admin/register',
  protect,
  adminOnly,
  registerAdmin
);

// Login
router.post('/login', authUser);

// Google Login
router.post('/google', googleLogin);

// Phone Login (with rate limiters)
router.post('/phone/request-otp', requestOtpLimiter, requestOtp);
router.post('/phone/verify-otp', verifyOtpLimiter, verifyPhoneOtp);

// Logout
router.post('/logout', logoutUser);

// Profile
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;