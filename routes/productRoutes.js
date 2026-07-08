const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createTextileProduct,
  listTextileProducts,
  getTextileProduct,
  getStorefrontTextileProduct,
  updateTextileProduct,
  updateTextileVariant,
  deleteTextileProduct,
  deleteTextileVariant,
  getTextileFilters,
  getProductsCreatedByStats,
  downloadProductsCreatedByExcel
} = require('../controllers/textileProductController');

const router = express.Router();

  router.get('/textile-filters', getTextileFilters);
  router.get('/textile-created-by-stats', protect, adminOnly, getProductsCreatedByStats);
  router.get('/textile-created-by-download', protect, adminOnly, downloadProductsCreatedByExcel);


router
  .route('/textile')
  .get(listTextileProducts)
  .post(protect, adminOnly, createTextileProduct);

router
  .route('/textile/variants/:variantId')
  .put(protect, adminOnly, updateTextileVariant)
  .delete(protect, adminOnly, deleteTextileVariant);

router.get('/textile-store/:id', getStorefrontTextileProduct);

router
  .route('/textile/:id')
  .get(protect, adminOnly, getTextileProduct)
  .put(protect, adminOnly, updateTextileProduct)
  .delete(protect, adminOnly, deleteTextileProduct);

router
  .route('/')
  .get(getProducts)
  .post(protect, adminOnly, createProduct);

router
  .route('/:id')
  .get(getProductById)
  .put(protect, adminOnly, updateProduct)
  .delete(protect, adminOnly, deleteProduct);


module.exports = router;  