const express = require('express');
const router = express.Router();
const {
  getBannerSliders,
  createBannerSlider,
  updateBannerSlider,
  patchBannerSlider,
  deleteBannerSlider
} = require('../controllers/Bannerslider.controller');

router.route('/')
  .get(getBannerSliders)
  .post(createBannerSlider);

router.route('/:id')
  .put(updateBannerSlider)
  .patch(patchBannerSlider)
  .delete(deleteBannerSlider);

module.exports = router;