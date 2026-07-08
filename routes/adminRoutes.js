const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUserRole,
  createAdminUser,
  deleteUser,
  getDashboardStats,
  makeSuperAdmin
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes are protected + admin only
router.use(protect);
router.use(adminOnly);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.post('/users', createAdminUser);
router.put('/users/:id', updateUserRole);
router.delete('/users/:id', deleteUser);
router.put("/make-superadmin", makeSuperAdmin);

module.exports = router;