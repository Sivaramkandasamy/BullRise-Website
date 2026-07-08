const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', protect, createOrder);
// Public tracking endpoint
router.get('/track/:orderId', trackOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id', protect, adminOnly, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);
router.delete('/my/:id', protect, deleteMyOrder);
router.delete('/my', protect, deleteMyOrderHistory);
router.delete('/:id', protect, adminOnly, deleteOrder);
router.get('/download', protect, adminOnly, downloadOrdersExcel);

module.exports = router;
