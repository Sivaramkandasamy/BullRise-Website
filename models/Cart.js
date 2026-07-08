const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'productModel',
      required: true
    },
    productModel: {
      type: String,
      enum: ['Product', 'TextileProduct'],
      default: 'Product',
      required: true
    },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true, default: 1 },
    size: String,
    color: String
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
