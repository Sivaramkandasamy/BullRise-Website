const express = require('express');
const router = express.Router();
const {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  toggleHeroBannerStatus
} = require('../controllers/heroBannerController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public – frontend can read banners
router.get('/', getHeroBanners);

// Admin only
router.post('/', protect, adminOnly, createHeroBanner);
router.put('/:id', protect, adminOnly, updateHeroBanner);
router.patch('/:id', protect, adminOnly, toggleHeroBannerStatus);
router.delete('/:id', protect, adminOnly, deleteHeroBanner);

module.exports = router;
