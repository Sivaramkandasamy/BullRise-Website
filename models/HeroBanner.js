const mongoose = require('mongoose');

const heroBannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  image: { type: String, required: true }, // URL string
  // Captured in admin but not currently rendered by Poster.jsx
  ctaPrimaryLabel: { type: String, default: 'View All' },
  // Read by Poster.jsx's click handler; left blank -> falls back to /all-product
  ctaPrimaryLink: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const HeroBanner = mongoose.model('HeroBanner', heroBannerSchema);
module.exports = HeroBanner;