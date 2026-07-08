const mongoose = require('mongoose');
const exclusiveBannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  image: { type: String, required: true }, // ✅ URL string
  link: String,
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ExclusiveBanner = mongoose.model('ExclusiveBanner', exclusiveBannerSchema);
module.exports = ExclusiveBanner;
