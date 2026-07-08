const express = require('express');
const router = express.Router();

const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getActiveCoupons,
  applyCoupon
} = require('../controllers/couponController');

const { protect, adminOnly: admin } = require('../middleware/authMiddleware');


// ===============================
// ADMIN ROUTES
// ===============================

// Create new coupon
router.post('/', protect, admin, createCoupon);

// Get all coupons
router.get('/', protect, admin, getCoupons);

// Get single coupon by ID
router.get('/:id', protect, admin, getCouponById);

// Update coupon
router.put('/:id', protect, admin, updateCoupon);

// Delete coupon
router.delete('/:id', protect, admin, deleteCoupon);


// ===============================
// USER ROUTES
// ===============================

// Get active coupons (for offers / checkout)
router.get('/active', getActiveCoupons);

// Apply coupon at checkout
router.post('/apply', protect, applyCoupon);


module.exports = router;
