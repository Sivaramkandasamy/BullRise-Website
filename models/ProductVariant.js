const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'TextileProduct', required: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: {
  type: String,
  default: "",
  trim: true,
  sparse: true
},
    size: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    stockAvailable: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    gst: { type: Number, required: true, min: 0, max: 28 },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true, trim: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    warehouseName: { type: String, required: true, trim: true },
    rackLocation: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DELETED'], default: 'ACTIVE' },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductVariant', productVariantSchema);
