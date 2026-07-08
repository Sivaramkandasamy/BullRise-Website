const express = require('express');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(protect, getAddresses)
  .post(protect, createAddress);

router
  .route('/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

// Set address as default
router.put('/:id/default', protect, setDefaultAddress);

module.exports = router;
