const express = require('express');
const router = express.Router();
const {
  getExclusiveBanners,
  createExclusiveBanner,
  updateExclusiveBanner,
  deleteExclusiveBanner,
  toggleExclusiveBannerStatus
} = require('../controllers/exclusiveBannerController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public – frontend can read banners
router.get('/', getExclusiveBanners);

// Admin only
router.post('/', protect, adminOnly, createExclusiveBanner);
router.put('/:id', protect, adminOnly, updateExclusiveBanner);
router.patch('/:id', protect, adminOnly, toggleExclusiveBannerStatus);
router.delete('/:id', protect, adminOnly, deleteExclusiveBanner);

module.exports = router;
