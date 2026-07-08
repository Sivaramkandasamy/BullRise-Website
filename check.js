// Quick check of actual products in DB
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const check = async () => {
  await connectDB();
  
  const total = await Product.countDocuments();
  const trending = await Product.countDocuments({ isTrending: true });
  const bestseller = await Product.countDocuments({ isBestSeller: true });
  const newArr = await Product.countDocuments({ isNewArrival: true });
  
  console.log('Total:', total);
  console.log('Trending:', trending);
  console.log('Bestseller:', bestseller);
  console.log('New Arrival:', newArr);
  
  // Show sample bestseller product
  const bs = await Product.findOne({ isBestSeller: true });
  if (bs) {
    console.log('\nSample Bestseller Product:');
    console.log(JSON.stringify({
      name: bs.name,
      isBestSeller: bs.isBestSeller,
      isTrending: bs.isTrending,
      isNewArrival: bs.isNewArrival
    }, null, 2));
  }
  
  process.exit(0);
};

check().catch(err => {
  console.error(err);
  process.exit(1);
});
