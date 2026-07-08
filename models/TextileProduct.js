  const mongoose = require('mongoose');

  
const textileProductSchema = new mongoose.Schema({
  name: String,
  slug: String,

  category: String,
  subCategory: String,
  productType: String,
  sleeveOrStyle: String,

  material: String,
  brand: String,

  description: String,

  color: String,
  colors: [String],

  images: [String],

  isNewArrival: Boolean,
  isBestSeller: Boolean,
  isTrending: Boolean,

  status: {
    type: String,
    default: "ACTIVE"
  },

  averageRating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

  module.exports = mongoose.model(
    "TextileProduct",
    textileProductSchema
  );