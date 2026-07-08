// // Diagnostic script to check product flags in database
// require('dotenv').config();
// const mongoose = require('mongoose');
// const Product = require('../models/Product');
// const connectDB = require('../config/db');

// const diagnose = async () => {
//   try {
//     await connectDB();

//     // console.log('\n=== PRODUCT FLAGS DIAGNOSIS ===\n');

//     const total = await Product.countDocuments();
//     // console.log(`Total Products: ${total}`);

//     const trending = await Product.countDocuments({ isTrending: true });
//     // console.log(`Trending (isTrending=true): ${trending}`);

//     const bestseller = await Product.countDocuments({ isBestSeller: true });
//     // console.log(`Best Seller (isBestSeller=true): ${bestseller}`);

//     const newArr = await Product.countDocuments({ isNewArrival: true });
//     // console.log(`New Arrival (isNewArrival=true): ${newArr}`);

//     // console.log('\n=== SAMPLE PRODUCTS ===\n');

//     // Get sample products with each flag
//     // if (bestseller > 0) {
//     //   const bs = await Product.findOne({ isBestSeller: true });
//     //   console.log('Sample Bestseller:');
//     //   console.log(`  Name: ${bs.name}`);
//     //   console.log(`  isBestSeller: ${bs.isBestSeller}`);
//     //   console.log(`  isTrending: ${bs.isTrending}`);
//     //   console.log(`  isNewArrival: ${bs.isNewArrival}`);
//     // } else {
//     //   console.log('No bestsellers found!');
//     // }

//     // if (trending > 0) {
//     //   const tr = await Product.findOne({ isTrending: true });
//     //   console.log('\nSample Trending:');
//     //   console.log(`  Name: ${tr.name}`);
//     //   console.log(`  isBestSeller: ${tr.isBestSeller}`);
//     //   console.log(`  isTrending: ${tr.isTrending}`);
//     //   console.log(`  isNewArrival: ${tr.isNewArrival}`);
//     // } else {
//     //   console.log('No trending products found!');
//     // }

//     // Check if flags exist at all
//     console.log('\n=== CHECKING FIELD EXISTENCE ===\n');
//     const sampleProduct = await Product.findOne();
//     if (sampleProduct) {
//       console.log('Sample product has these flag fields:');
//       console.log(`  isTrending: ${sampleProduct.hasOwnProperty('isTrending')} (value: ${sampleProduct.isTrending})`);
//       console.log(`  isBestSeller: ${sampleProduct.hasOwnProperty('isBestSeller')} (value: ${sampleProduct.isBestSeller})`);
//       console.log(`  isNewArrival: ${sampleProduct.hasOwnProperty('isNewArrival')} (value: ${sampleProduct.isNewArrival})`);
//     }

//     console.log('\n');
//     process.exit(0);
//   } catch (error) {
//     console.error('Diagnosis error:', error);
//     process.exit(1);
//   }
// };

// diagnose();
