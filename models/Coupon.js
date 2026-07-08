const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    image: { type: String },

    code: { type: String, required: true, unique: true, uppercase: true },

    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },

    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },

    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
