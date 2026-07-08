const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'TextileProduct', required: true, index: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true, index: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    type: { type: String, enum: ['STOCK_OPENING', 'FINISHED_GOODS_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
