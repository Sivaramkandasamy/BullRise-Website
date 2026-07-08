// Fix script: Add missing badge flags to products
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../config/db');

const fixProducts = async () => {
  try {
    await connectDB();

    console.log('\n=== FIXING PRODUCT FLAGS ===\n');

    // Update all products to ensure they have the fields with default values
    const result = await Product.updateMany(
      {},
      {
        $set: {
          isTrending: { $ifNull: ['$isTrending', false] },
          isBestSeller: { $ifNull: ['$isBestSeller', false] },
          isNewArrival: { $ifNull: ['$isNewArrival', false] }
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} products`);

    // Now reseed with proper flags
    console.log('\nClearing existing data...');
    await Product.deleteMany({});
    await Product.collection.dropIndexes(); // Reset indexes

    // Get categories
    const Category = require('../models/Category');
    const categories = await Category.find();

    if (categories.length === 0) {
      console.log('No categories found. Please seed categories first with: npm run seed');
      process.exit(1);
    }

    console.log('Re-inserting products with proper flags...');

    const catId = (slug) => categories.find((c) => c.slug === slug)?._id;

    const tshirtImages = [
      'https://veirdo.in/cdn/shop/files/67_11.jpg?v=1758285223',
      'https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1740758781-mhl-mens-cloth-huckberry-749-67c1ded533637.jpg?crop=0.340xw:0.849xh;0.348xw,0.131xh&resize=980:*',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1Dc6bXhLuGlex7flAtBytAAdsFTf6SkZ5iA&s'
    ];

    const products = [];

    // Create sample products with proper flags
    const tshirtSubcategories = [
      'Plain T-Shirts',
      'Printed T-Shirts',
      'Regular Fit T-Shirts',
      'Oversized T-Shirts',
      'Polo T-Shirts',
      'Plus Size T-Shirts',
      'Full Sleeve T-Shirts'
    ];

    tshirtSubcategories.forEach((sub, index) => {
      for (let i = 1; i <= 3; i++) {
        const basePrice = 399 + (index % 3) * 50;
        const mrp = basePrice + 300;

        products.push({
          name: `${sub.replace('T-Shirts', 'Tee')} ${i}`,
          slug: `${sub.toLowerCase().replace(/\s+/g, '-')}-${i}`,
          description: `MetroMensWear ${sub.toLowerCase()} designed for daily metro runs.`,
          price: basePrice,
          mrp,
          category: catId('men'),
          subCategory: sub,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Black', 'White'],
          stock: 20 + i * 3,
          images: [tshirtImages[i % tshirtImages.length]],
          isNewArrival: i === 1,    // First variant is new
          isBestSeller: i === 2,     // Second variant is bestseller
          isTrending: i === 3        // Third variant is trending
        });
      }
    });

    const inserted = await Product.insertMany(products);
    console.log(`Inserted ${inserted.length} products with proper flags\n`);

    // Show summary
    const total = await Product.countDocuments();
    const trending = await Product.countDocuments({ isTrending: true });
    const bestseller = await Product.countDocuments({ isBestSeller: true });
    const newArr = await Product.countDocuments({ isNewArrival: true });

    // console.log('=== SUMMARY ===');
    // console.log(`Total Products: ${total}`);
    // console.log(`Trending: ${trending}`);
    // console.log(`Best Seller: ${bestseller}`);
    // console.log(`New Arrival: ${newArr}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Fix error:', error);
    process.exit(1);
  }
};

fixProducts();
