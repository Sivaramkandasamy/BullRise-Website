const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getCart);       // GET /api/cart
router.post('/', protect, addToCart);    // POST /api/cart
router.put('/', protect, updateCartItem); // PUT /api/cart
router.delete('/', protect, removeFromCart); // DELETE /api/cart (remove single item)
router.delete('/clear', protect, clearCart); // DELETE /api/cart/clear (clear entire cart)

module.exports = router;
