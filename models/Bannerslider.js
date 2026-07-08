const mongoose = require('mongoose');

const bannerSliderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      required: [true, 'Image URL is required']
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BannerSlider', bannerSliderSchema);