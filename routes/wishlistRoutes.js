const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/wishlist       -> list
// POST /api/wishlist      -> add
router
  .route('/')
  .get(protect, getWishlist)
  .post(protect, addToWishlist);

// DELETE /api/wishlist/:productId -> remove
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
