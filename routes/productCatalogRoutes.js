const express = require('express');
const {
  getTextileConfig,
  getTextileNavigation
} = require('../controllers/textileProductController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/textile-navigation', getTextileNavigation);
router.get('/textile-config', protect, adminOnly, getTextileConfig);

module.exports = router;
