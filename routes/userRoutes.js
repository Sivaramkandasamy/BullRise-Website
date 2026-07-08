const express = require('express');
const {
  // existing handlers: registerUser, authUser, etc.
  getMe,
  updateMe,
  getUsers
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ profile routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get("/admin/users", protect, adminOnly, getUsers);

module.exports = router;
