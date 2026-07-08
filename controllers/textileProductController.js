const asyncHandler = require('express-async-handler');
const ExcelJS = require('exceljs');
const TextileProduct = require('../models/TextileProduct');
const ProductVariant = require('../models/ProductVariant');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const ActivityLog = require('../models/ActivityLog');
const {
  textileCategoryTree,
  materials,
  colors,
  sizeRules,
  codeFor,
  getSizeOptions
} = require('../config/textileCatalog');

const DEFAULT_SUPPLIERS = [
  { name: 'BullRise Textiles', code: 'BRT', phone: '9000000001', email: 'supply@bullrise.in' },
  { name: 'Metro Fabric House', code: 'MFH', phone: '9000000002', email: 'orders@metrofabric.in' },
  { name: 'South India Garments', code: 'SIG', phone: '9000000003', email: 'sales@sigarments.in' }
];

const DEFAULT_WAREHOUSES = [
  { name: 'BullRise Main Warehouse', code: 'MAIN', location: 'Main inventory floor' },
  { name: 'BullRise Store Stock', code: 'STORE', location: 'Retail store' }
];

const ensureInventoryDefaults = async () => {
  await Promise.all([
    ...DEFAULT_SUPPLIERS.map((supplier) =>
      Supplier.findOneAndUpdate({ code: supplier.code }, { $setOnInsert: supplier }, { upsert: true, new: true })
    ),
    ...DEFAULT_WAREHOUSES.map((warehouse) =>
      Warehouse.findOneAndUpdate({ code: warehouse.code }, { $setOnInsert: warehouse }, { upsert: true, new: true })
    )
  ]);
};

const getNode = (category, subCategory, productType) => {
  console.log("CATEGORY RECEIVED =", category);
  console.log("TYPE =", typeof category);
  console.log("AVAILABLE =", Object.keys(textileCategoryTree));
  const categoryNode = textileCategoryTree[category];
  if (!categoryNode) return { error: 'Invalid textile category' };

  const subCategoryNode = categoryNode[subCategory];
  if (subCategoryNode === undefined) return { error: 'Invalid sub category for selected category' };

  if (subCategoryNode && productType) {
    if (!Object.prototype.hasOwnProperty.call(subCategoryNode, productType)) {
      return { error: 'Invalid product type for selected sub category' };
    }
    return { categoryNode, subCategoryNode, productTypeNode: subCategoryNode[productType] };
  }

  if (subCategoryNode && !productType) {
    return { error: 'Product type is required for selected sub category' };
  }

  return { categoryNode, subCategoryNode, productTypeNode: null };
};

const validateTextilePayload = async (payload, { requireVariants = true } = {}) => {
  const required = ['name', 'category', 'subCategory', 'material', 'brand'];
  const missing = required.find((field) => !String(payload[field] || '').trim());
  if (missing) return `${missing} is required`;

  const hierarchy = getNode(payload.category, payload.subCategory, payload.productType);
  if (hierarchy.error) return hierarchy.error;

  if (hierarchy.productTypeNode && !payload.sleeveOrStyle) {
    return 'Sleeve / style is required for selected product type';
  }
  if (
    hierarchy.productTypeNode &&
    payload.sleeveOrStyle &&
    !Object.prototype.hasOwnProperty.call(hierarchy.productTypeNode, payload.sleeveOrStyle)
  ) {
    return 'Invalid sleeve / style for selected product type';
  }

  if (!materials.includes(payload.material)) return 'Invalid material';
  const selectedColors = Array.isArray(payload.colors)
    ? payload.colors
    : payload.color
      ? [payload.color]
      : [];
  if (selectedColors.length === 0) return 'At least one color is required';
  if (selectedColors.some((color) => !colors.includes(color))) return 'Invalid color';

  if (!requireVariants) return null;
  if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
    return 'At least one size variant is required';
  }

  const allowedSizes = getSizeOptions(payload);
  const seenSizes = new Set();
  for (const variant of payload.variants) {
    if (!allowedSizes.includes(String(variant.size))) return `Invalid size: ${variant.size}`;
    if (seenSizes.has(String(variant.size))) return `Duplicate size: ${variant.size}`;
    seenSizes.add(String(variant.size));

    const numericFields = ['quantity', 'purchasePrice', 'wholesalePrice', 'retailPrice', 'mrp', 'gst'];
    for (const field of numericFields) {
      const value = Number(variant[field]);
      if (!Number.isFinite(value) || value < 0) return `${field} must be a number greater than or equal to 0`;
    }
    if (Number(variant.gst) > 28) return 'GST must be between 0 and 28';
    if (Number(variant.wholesalePrice) < Number(variant.purchasePrice)) {
      return 'Wholesale price must be greater than or equal to purchase price';
    }
    if (Number(variant.retailPrice) < Number(variant.wholesalePrice)) {
      return 'Retail price must be greater than or equal to wholesale price';
    }
    if (Number(variant.mrp) < Number(variant.retailPrice)) {
      return 'MRP must be greater than or equal to retail price';
    }
    if (!String(variant.supplierName || '').trim()) return 'Supplier is required for every size';
    if (!String(variant.warehouseName || '').trim()) return 'Warehouse is required for every size';
  }

  return null;
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const uniqueValue = async (Model, field, baseValue) => {
  let candidate = baseValue;
  let suffix = 0;
  while (await Model.exists({ [field]: candidate })) {
    suffix += 1;
    candidate = `${baseValue}-${String(suffix).padStart(3, '0')}`;
  }
  return candidate;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveSupplier = async (name) => {
  const supplierName = String(name || '').trim();
  if (!supplierName) return null;
  const existing = await Supplier.findOne({
    name: { $regex: `^${escapeRegex(supplierName)}$`, $options: 'i' }
  });
  if (existing) return existing;

  const code = await uniqueValue(
    Supplier,
    'code',
    `SUP-${supplierName.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'GENERAL'}`
  );
  return Supplier.create({ name: supplierName, code, status: 'ACTIVE' });
};

const resolveWarehouse = async (name) => {
  const warehouseName = String(name || '').trim();
  if (!warehouseName) return null;
  const existing = await Warehouse.findOne({
    name: { $regex: `^${escapeRegex(warehouseName)}$`, $options: 'i' }
  });
  if (existing) return existing;

  const code = await uniqueValue(
    Warehouse,
    'code',
    `WH-${warehouseName.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'GENERAL'}`
  );
  return Warehouse.create({ name: warehouseName, code, status: 'ACTIVE' });
};

const buildSkuBase = (product, size) => {
  const parts = [
    'BR',
    codeFor(product.category),
    codeFor(product.subCategory, 8),
    codeFor(product.productType, 6),
    codeFor(product.sleeveOrStyle, 4),
    codeFor(product.material),
    ...(product.colors?.length ? product.colors : [product.color]).map((color) => codeFor(color)),
    String(size).toUpperCase().replace(/[^A-Z0-9-]/g, '')
  ].filter(Boolean);
  return parts.join('-');
};

const getTextileConfig = asyncHandler(async (req, res) => {
  await ensureInventoryDefaults();
  const [suppliers, warehouses] = await Promise.all([
    Supplier.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean(),
    Warehouse.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean()
  ]);
  res.json({ categoryTree: textileCategoryTree, materials, colors, sizeRules, suppliers, warehouses });
});

const getTextileNavigation = asyncHandler(async (req, res) => {
  res.json({ categoryTree: textileCategoryTree });
});

const createTextileProduct = asyncHandler(async (req, res) => {

  console.log("============== REQUEST BODY ==============");
  console.log(JSON.stringify(req.body, null, 2));

  const validationError = await validateTextilePayload(req.body, {
    requireVariants: false
  });

  if (validationError) {
    console.log("VALIDATION ERROR:", validationError);
    res.status(400);
    throw new Error(validationError);
  }

  const slugBase = slugify(req.body.slug || req.body.name);
  const slug = await uniqueValue(TextileProduct, "slug", slugBase);

  const productData = {
    name: req.body.name?.trim(),
    slug,

    category: req.body.category,
    subCategory: req.body.subCategory,
    productType: req.body.productType || "",
    sleeveOrStyle: req.body.sleeveOrStyle || "",

    material: req.body.material,
    brand: req.body.brand?.trim(),

    description: req.body.description || "",

    color: req.body.color || req.body.colors?.[0] || "",
    colors: req.body.colors || [],

    sizes: req.body.sizes || [],

    images: req.body.images || [],

    purchasePrice: Number(req.body.purchasePrice) || 0,
    wholesalePrice: Number(req.body.wholesalePrice) || 0,
    retailPrice: Number(req.body.retailPrice) || 0,
    mrp: Number(req.body.mrp) || 0,
    gst: Number(req.body.gst) || 0,
    stock: Number(req.body.stock) || 0,

    supplierName:
      req.body.supplierName || "BullRise Textiles",

    warehouseName:
      req.body.warehouseName || "BullRise Main Warehouse",

    rackLocation: req.body.rackLocation || "",

    isNewArrival: Boolean(req.body.isNewArrival),
    isBestSeller: Boolean(req.body.isBestSeller),
    isTrending: Boolean(req.body.isTrending),

    status: req.body.status || "ACTIVE",
      createdBy: req.user._id
  };

  console.log("DATA TO SAVE =>");
  console.log(productData);

  const product = await TextileProduct.create(productData);

  if (Array.isArray(req.body.variants) && req.body.variants.length > 0) {
    for (const item of req.body.variants) {

      const supplier = await resolveSupplier(item.supplierName);
      const warehouse = await resolveWarehouse(item.warehouseName);

      const sku = await uniqueValue(
        ProductVariant,
        "sku",
        buildSkuBase(product, item.size)
      );

      await ProductVariant.create({
        productId: product._id,
        sku,
        barcode: item.barcode || `${Date.now()}-${item.size}`,
        size: item.size,
        quantity: Number(item.quantity),
        stockAvailable: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        wholesalePrice: Number(item.wholesalePrice),
        retailPrice: Number(item.retailPrice),
        mrp: Number(item.mrp),
        gst: Number(item.gst),
        supplierId: supplier._id,
        supplierName: supplier.name,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        rackLocation: item.rackLocation || "",
        status: "ACTIVE"
      });
    }
  }


  console.log("SAVED PRODUCT =>");
  console.log(product);

  res.status(201).json(product);
});




const listTextileProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);

  const filter = {
    status: { $ne: "DELETED" },
  };

  [
    "category",
    "subCategory",
    "productType",
    "sleeveOrStyle",
    "material",
    "brand",
    "color",
    "status",
  ].forEach((field) => {
    if (req.query[field]) filter[field] = req.query[field];
  });

  if (req.query.new === "true") filter.isNewArrival = true;
  if (req.query.bestseller === "true") filter.isBestSeller = true;
  if (req.query.trending === "true") filter.isTrending = true;

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { brand: { $regex: req.query.search, $options: "i" } },
      { color: { $regex: req.query.search, $options: "i" } },
      { colors: { $regex: req.query.search, $options: "i" } },
    ];
  }

 const [products, totalProducts] = await Promise.all([
  TextileProduct.find(filter)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),

  TextileProduct.countDocuments(filter),
]);

  const productIds = products.map((p) => p._id);

  const variants = await ProductVariant.find({
    productId: { $in: productIds },
    status: { $ne: "DELETED" },
  })
    .populate("supplierId", "name code")
    .populate("warehouseId", "name code")
    .lean();

  const rows = products.map((product) => {
    const productVariants = variants.filter(
      (v) => v.productId.toString() === product._id.toString()
    );

    return {
      ...product,

      catalogType: "textile",

      totalVariants: productVariants.length,

      totalStock: productVariants.reduce(
        (sum, item) => sum + Number(item.stockAvailable || 0),
        0
      ),

      stock: productVariants.reduce(
        (sum, item) => sum + Number(item.stockAvailable || 0),
        0
      ),

      retailPriceMin:
        productVariants.length > 0
          ? Math.min(...productVariants.map((v) => Number(v.retailPrice)))
          : 0,

      retailPriceMax:
        productVariants.length > 0
          ? Math.max(...productVariants.map((v) => Number(v.retailPrice)))
          : 0,

      price:
        productVariants.length > 0
          ? Math.min(...productVariants.map((v) => Number(v.retailPrice)))
          : 0,

      colors: product.colors,

      variants: productVariants.map((variant) => ({
        _id: variant._id,

        sku: variant.sku,

        barcode: variant.barcode,

        size: variant.size,

        quantity: variant.quantity,

        stockAvailable: variant.stockAvailable,

        purchasePrice: variant.purchasePrice,

        wholesalePrice: variant.wholesalePrice,

        retailPrice: variant.retailPrice,

        mrp: variant.mrp,

        gst: variant.gst,

        supplier: variant.supplierId,

        warehouse: variant.warehouseId,

        supplierName: variant.supplierName,

        warehouseName: variant.warehouseName,

        rackLocation: variant.rackLocation,

        status: variant.status,
      })),
    };
  });

  res.json({
    products: rows,
    totalProducts,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalProducts / limit), 1),
  });
});






const getTextileProduct = asyncHandler(async (req, res) => {
  const product = await TextileProduct.findOne({ _id: req.params.id, status: { $ne: 'DELETED' } }).lean();
  if (!product) {
    res.status(404);
    throw new Error('Textile product not found');
  }
  const [variants, movements, activity] = await Promise.all([
    ProductVariant.find({ productId: product._id, status: { $ne: 'DELETED' } })
      .populate('supplierId', 'name code')
      .populate('warehouseId', 'name code')
      .sort({ size: 1 })
      .lean(),
    StockMovement.find({ productId: product._id }).sort({ createdAt: -1 }).limit(100).lean(),
    ActivityLog.find({ entityType: 'TextileProduct', entityId: product._id }).sort({ createdAt: -1 }).limit(50).lean()
  ]);
  res.json({ ...product, variants, movements, activity });
});

const getStorefrontTextileProduct = asyncHandler(async (req, res) => {
  const product = await TextileProduct.findOne({
    _id: req.params.id,
    status: 'ACTIVE'
  }).lean();
  if (!product) {
    res.status(404);
    throw new Error('Textile product not found');
  }

  const variants = await ProductVariant.find({
    productId: product._id,
    status: 'ACTIVE'
  })
    .select('sku size stockAvailable retailPrice mrp gst')
    .sort({ size: 1 })
    .lean();

  res.json({ ...product, variants, catalogType: 'textile' });
});

const updateTextileProduct = asyncHandler(async (req, res) => {
  const validationError = await validateTextilePayload(req.body, {
    requireVariants: true
  });
  if (validationError) {
    res.status(400);
    throw new Error(validationError);
  }
  const product = await TextileProduct.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: 'DELETED' } },
    {
      $set: {
        name: req.body.name.trim(),
        category: req.body.category,
        subCategory: req.body.subCategory,
        productType: req.body.productType || '',
        sleeveOrStyle: req.body.sleeveOrStyle || '',
        material: req.body.material,
        brand: req.body.brand.trim(),

        color: req.body.colors?.[0] || '',
        colors: req.body.colors || [],
        sizes: req.body.sizes || [],

        description: req.body.description || '',
        images: req.body.images || [],

        purchasePrice: Number(req.body.purchasePrice || 0),
        wholesalePrice: Number(req.body.wholesalePrice || 0),
        retailPrice: Number(req.body.retailPrice || 0),
        mrp: Number(req.body.mrp || 0),
        gst: Number(req.body.gst || 0),

        stock: Number(req.body.stock || 0),

        supplierName: req.body.supplierName || "BullRise Textiles",
        warehouseName: req.body.warehouseName || "BullRise Main Warehouse",
        rackLocation: req.body.rackLocation || "",

        isNewArrival:
          req.body.isNewArrival === true ||
          req.body.isNewArrival === "true",

        isBestSeller:
          req.body.isBestSeller === true ||
          req.body.isBestSeller === "true",

        isTrending:
          req.body.isTrending === true ||
          req.body.isTrending === "true",

        status: req.body.status || "ACTIVE"
      }
    },
    { new: true }
  );
  if (!product) {
    res.status(404);
    throw new Error('Textile product not found');
  }
  await ActivityLog.create({
    entityType: 'TextileProduct',
    entityId: product._id,
    action: 'UPDATE',
    description: `Updated base details for ${product.name}`,
    createdBy: req.user?._id
  });
  res.json(product);
});

const updateTextileVariant = asyncHandler(async (req, res) => {
  const variant = await ProductVariant.findOne({ _id: req.params.variantId, status: { $ne: 'DELETED' } });
  if (!variant) {
    res.status(404);
    throw new Error('Variant not found');
  }

  const next = {
    quantity: req.body.quantity ?? variant.quantity,
    stockAvailable: req.body.stockAvailable ?? variant.stockAvailable,
    purchasePrice: req.body.purchasePrice ?? variant.purchasePrice,
    wholesalePrice: req.body.wholesalePrice ?? variant.wholesalePrice,
    retailPrice: req.body.retailPrice ?? variant.retailPrice,
    mrp: req.body.mrp ?? variant.mrp,
    gst: req.body.gst ?? variant.gst
  };
  const validationError = await validateTextilePayload({
    name: 'Variant',
    category: 'MEN',
    subCategory: 'Shorts',
    material: 'Cotton',
    brand: 'Validation',
    color: 'Black',
    variants: [{
      ...next,
      size: 'M',
      supplierName: req.body.supplierName || variant.supplierName,
      warehouseName: req.body.warehouseName || variant.warehouseName
    }]
  });
  if (validationError && !validationError.startsWith('Invalid size')) {
    res.status(400);
    throw new Error(validationError);
  }

  if (req.body.barcode && req.body.barcode !== variant.barcode) {
    if (await ProductVariant.exists({ barcode: req.body.barcode, _id: { $ne: variant._id } })) {
      res.status(400);
      throw new Error('Barcode already exists');
    }
    variant.barcode = req.body.barcode.trim();
  }

  const previousStock = variant.stockAvailable;
  const [supplier, warehouse] = await Promise.all([
    resolveSupplier(req.body.supplierName || variant.supplierName),
    resolveWarehouse(req.body.warehouseName || variant.warehouseName)
  ]);

  Object.assign(variant, {
    quantity: Number(next.quantity),
    stockAvailable: Number(next.stockAvailable),
    purchasePrice: Number(next.purchasePrice),
    wholesalePrice: Number(next.wholesalePrice),
    retailPrice: Number(next.retailPrice),
    mrp: Number(next.mrp),
    gst: Number(next.gst),
    supplierId: supplier._id,
    supplierName: supplier.name,
    warehouseId: warehouse._id,
    warehouseName: warehouse.name,
    rackLocation: req.body.rackLocation ?? variant.rackLocation,
    status: req.body.status || variant.status
  });
  await variant.save();

  const delta = variant.stockAvailable - previousStock;
  if (delta !== 0) {
    await StockMovement.create({
      productId: variant.productId,
      variantId: variant._id,
      warehouseId: variant.warehouseId,
      type: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      quantity: Math.abs(delta),
      balanceAfter: variant.stockAvailable,
      note: req.body.stockNote || 'Admin variant stock update',
      createdBy: req.user?._id
    });
  }

  await ActivityLog.create({
    entityType: 'TextileProduct',
    entityId: variant.productId,
    action: 'VARIANT_UPDATE',
    description: `Updated variant ${variant.sku}`,
    metadata: { variantId: variant._id, stockDelta: delta },
    createdBy: req.user?._id
  });
  res.json(variant);
});

const deleteTextileProduct = asyncHandler(async (req, res) => {
  const product = await TextileProduct.findOneAndUpdate(
    { _id: req.params.id, status: { $ne: 'DELETED' } },
    { status: 'DELETED', deletedAt: new Date() },
    { new: true }
  );
  if (!product) {
    res.status(404);
    throw new Error('Textile product not found');
  }
  await ProductVariant.updateMany(
    { productId: product._id, status: { $ne: 'DELETED' } },
    { status: 'DELETED', deletedAt: new Date() }
  );
  await ActivityLog.create({
    entityType: 'TextileProduct',
    entityId: product._id,
    action: 'DELETE',
    description: `Soft deleted ${product.name}`,
    createdBy: req.user?._id
  });
  res.json({ message: 'Textile product deleted' });
});

const deleteTextileVariant = asyncHandler(async (req, res) => {
  const variant = await ProductVariant.findOneAndUpdate(
    { _id: req.params.variantId, status: { $ne: 'DELETED' } },
    { status: 'DELETED', deletedAt: new Date() },
    { new: true }
  );
  if (!variant) {
    res.status(404);
    throw new Error('Variant not found');
  }
  await ActivityLog.create({
    entityType: 'TextileProduct',
    entityId: variant.productId,
    action: 'VARIANT_DELETE',
    description: `Soft deleted variant ${variant.sku}`,
    metadata: { variantId: variant._id },
    createdBy: req.user?._id
  });
  res.json({ message: 'Variant deleted' });
});

const getTextileFilters = asyncHandler(async (req, res) => {
  try {
    console.log("TEXTILE FILTER API HIT");

    const matchFilter = { status: { $ne: "DELETED" } };
    if (req.query.subCategory) {
      matchFilter.subCategory = req.query.subCategory;
    }

    const products = await TextileProduct.find(matchFilter).lean();

    const unique = (field) => [
      ...new Set(
        products
          .map((p) => p[field])
          .flat()
          .filter(Boolean)
      ),
    ];

    res.json({
      category: unique("category"),
      subCategory: unique("subCategory"),
      productType: unique("productType"),
      sleeveOrStyle: unique("sleeveOrStyle"),
      material: unique("material"),
      brand: unique("brand"),
      colors: unique("colors"),
      priceRange: [
        "0-500",
        "500-1000",
        "1000-2000",
        "2000-5000",
        "5000+"
      ]
    });
  } catch (err) {
    console.error("TEXTILE FILTER ERROR:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});

// "Products Added By" breakdown — groups active textile products by
// createdBy and joins User for name/email, sorted highest-first.
//
// ⚠️ Only counts products that have createdBy set. Any product created
// before the createdBy fix went in has no creator recorded and won't show
// up under anyone — that's a historical-data gap, not a bug in this query.
const getProductsCreatedByStats = asyncHandler(async (req, res) => {
  const stats = await TextileProduct.aggregate([
    { $match: { status: { $ne: 'DELETED' }, createdBy: { $exists: true, $ne: null } } },
    { $group: { _id: '$createdBy', totalProducts: { $sum: 1 } } },
    { $sort: { totalProducts: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ['$user.name', 'Unknown'] },
        email: { $ifNull: ['$user.email', ''] },
        totalProducts: 1
      }
    }
  ]);

  res.json(stats);
});

// Excel report: "who created which product" — mirrors downloadOrdersExcel's
// pattern exactly (same ExcelJS workbook/worksheet/columns/write approach).
// Sheet 1 lists every product with its creator and full details; Sheet 2 is
// the same count-per-creator summary as getProductsCreatedByStats above,
// so the file is useful both as a detail export and a quick summary.
const downloadProductsCreatedByExcel = asyncHandler(async (req, res) => {
  // Only products with a known creator — same filter already used in
  // getProductsCreatedByStats above. Older products created before the
  // createdBy fix have no creator recorded and are skipped entirely here,
  // rather than showing up as "Unknown".
  const products = await TextileProduct.find({
    status: { $ne: 'DELETED' },
    createdBy: { $exists: true, $ne: null }
  })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Price and stock live on ProductVariant, not the top-level product —
  // same fact established earlier for the wishlist/ProductCard fix. Fetch
  // all variants for these products and aggregate min/max/total per
  // product, mirroring listTextileProducts' exact approach, instead of
  // reading product.retailPrice/product.stock directly (always 0/empty).
  const productIds = products.map((p) => p._id);
  const variants = await ProductVariant.find({
    productId: { $in: productIds },
    status: { $ne: 'DELETED' }
  }).lean();

  const variantsByProduct = new Map();
  variants.forEach((v) => {
    const key = v.productId.toString();
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key).push(v);
  });

  const workbook = new ExcelJS.Workbook();

  // ---- Sheet 1: full product detail, one row per product ----
  const detailSheet = workbook.addWorksheet('Products');

  detailSheet.columns = [
    { header: 'Created By', key: 'createdByName', width: 20 },
    { header: 'Created By Email', key: 'createdByEmail', width: 28 },
    { header: 'Product Name', key: 'name', width: 28 },
    { header: 'Category', key: 'category', width: 12 },
    { header: 'Sub Category', key: 'subCategory', width: 16 },
    { header: 'Product Type', key: 'productType', width: 16 },
    { header: 'Sleeve / Style', key: 'sleeveOrStyle', width: 16 },
    { header: 'Material', key: 'material', width: 14 },
    { header: 'Brand', key: 'brand', width: 14 },
    { header: 'Color(s)', key: 'colors', width: 20 },
    { header: 'Variants', key: 'totalVariants', width: 10 },
    { header: 'Purchase Price', key: 'purchasePrice', width: 14 },
    { header: 'Wholesale Price', key: 'wholesalePrice', width: 15 },
    { header: 'Retail Price', key: 'retailPrice', width: 16 },
    { header: 'MRP', key: 'mrp', width: 16 },
    { header: 'Total Stock', key: 'stock', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];

  products.forEach((product) => {
    const productVariants = variantsByProduct.get(product._id.toString()) || [];

    const retailPrices = productVariants.map((v) => Number(v.retailPrice) || 0);
    const mrps = productVariants.map((v) => Number(v.mrp) || 0);
    const totalStock = productVariants.reduce((sum, v) => sum + Number(v.stockAvailable || 0), 0);

    // Purchase/wholesale price is typically uniform across a product's
    // variants (confirmed across every product seen so far in this app),
    // so the first variant's value is used rather than a min-max range.
    const purchasePrice = productVariants[0]?.purchasePrice || 0;
    const wholesalePrice = productVariants[0]?.wholesalePrice || 0;

    const retailMin = retailPrices.length ? Math.min(...retailPrices) : 0;
    const retailMax = retailPrices.length ? Math.max(...retailPrices) : 0;
    const mrpMin = mrps.length ? Math.min(...mrps) : 0;
    const mrpMax = mrps.length ? Math.max(...mrps) : 0;

    detailSheet.addRow({
      createdByName: product.createdBy?.name || 'Unknown',
      createdByEmail: product.createdBy?.email || '',
      name: product.name,
      category: product.category,
      subCategory: product.subCategory,
      productType: product.productType || '',
      sleeveOrStyle: product.sleeveOrStyle || '',
      material: product.material,
      brand: product.brand,
      colors: product.colors?.join(', ') || product.color || '',
      totalVariants: productVariants.length,
      purchasePrice,
      wholesalePrice,
      retailPrice: retailMin === retailMax ? retailMin : `${retailMin} - ${retailMax}`,
      mrp: mrpMin === mrpMax ? mrpMin : `${mrpMin} - ${mrpMax}`,
      stock: totalStock,
      status: product.status,
      createdAt: new Date(product.createdAt).toLocaleString()
    });
  });

  // ---- Sheet 2: count-per-creator summary ----
  const summarySheet = workbook.addWorksheet('Summary by Creator');
  summarySheet.columns = [
    { header: 'Created By', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Total Products', key: 'totalProducts', width: 16 }
  ];

  const countByCreator = new Map();
  products.forEach((product) => {
    const key = product.createdBy?._id?.toString() || 'unknown';
    const existing = countByCreator.get(key) || {
      name: product.createdBy?.name || 'Unknown',
      email: product.createdBy?.email || '',
      totalProducts: 0
    };
    existing.totalProducts += 1;
    countByCreator.set(key, existing);
  });

  [...countByCreator.values()]
    .sort((a, b) => b.totalProducts - a.totalProducts)
    .forEach((row) => summarySheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=products-created-by.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});


module.exports = {
  getTextileConfig,
  getTextileNavigation,
  createTextileProduct,
  listTextileProducts,
  getTextileProduct,
  getStorefrontTextileProduct,
  updateTextileProduct,
  updateTextileVariant,
  deleteTextileProduct,
  deleteTextileVariant,
  ensureInventoryDefaults,
  buildSkuBase,
  getTextileFilters,
  getProductsCreatedByStats,
  downloadProductsCreatedByExcel
};