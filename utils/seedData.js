// backend/utils/seedData.js
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const HeroBanner = require('../models/HeroBanner');
const ExclusiveBanner = require('../models/ExclusiveBanner');

const seed = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      HeroBanner.deleteMany(),
      ExclusiveBanner.deleteMany()
    ]);

    console.log('Creating admin user...');
    await User.create({
      name: 'Admin User',
      email: 'admin@bullrise.com',
      password: 'Admin@123', // pre-save hook will hash
      isAdmin: true
    });

    console.log('Seeding categories...');
    const categoriesData = [
      { name: 'Men', slug: 'men', description: 'Men T-shirts & essentials' },
      { name: 'Shirts', slug: 'shirts', description: 'Casual & formal shirts' },
      { name: 'Oversized', slug: 'oversized', description: 'Oversized tees' },
      { name: 'Printed', slug: 'printed', description: 'Printed & graphic tees' },
      { name: 'Winterwear', slug: 'winterwear', description: 'Hoodies, jackets & layers' },
      { name: 'Bottomwear', slug: 'bottomwear', description: 'Joggers, cargos, jeans & more' }
    ];

    const categories = await Category.insertMany(categoriesData);
    const catId = (slug) => categories.find((c) => c.slug === slug)._id;

    // Number of items to generate per subcategory (configurable)
    const ITEMS_PER_SUB = parseInt(process.env.SEED_ITEMS_PER_SUBCATEGORY, 10) || 100;
    console.log(`Seeding ${ITEMS_PER_SUB} items per subcategory (SEED_ITEMS_PER_SUBCATEGORY=${process.env.SEED_ITEMS_PER_SUBCATEGORY || 'not set'})`);

    const tshirtImages = [
      'https://veirdo.in/cdn/shop/files/67_11.jpg?v=1758285223',
      'https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1740758781-mhl-mens-cloth-huckberry-749-67c1ded533637.jpg?crop=0.340xw:0.849xh;0.348xw,0.131xh&resize=980:*',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1Dc6bXhLuGlex7flAtBytAAdsFTf6SkZ5iA&s'
    ];
    const shirtImages = [
      'https://english.cdn.zeenews.com/sites/default/files/manian.jpg',
      'https://assets.ajio.com/medias/sys_master/root/20250416/CDZC/67ff5e1155340d4b4fde4c66/-473Wx593H-701227087-green-MODEL.jpg',
      'https://images-eu.ssl-images-amazon.com/images/I/71VIEe19U1L._AC_UL600_SR600,600_.jpg'
    ];
    const winterImages = [
      'https://static.10kya.com/media/catalog/product/cache/1/image/1080x/b05d625d6b6a602168d46abb7a406194/w/i/winter-thick-jackets-coats-maroon-1-winter-stylish-clothing-online-india-1100x1100_1_1.jpg',
      'https://assets.myntassets.com/dpr_1.5,q_30,w_400,c_limit,fl_progressive/assets/images/2025/APRIL/24/tjlztGaF_822d160dea33450c94a27cc17dfdaf4c.jpg',
      'https://5.imimg.com/data5/SELLER/Default/2023/9/347670384/QO/FZ/LG/198540386/mens-winter-wear-jackets.png'
    ];
    const bottomImages = [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSybRVKrDbs5Xtw4fRFVCofgHJ5W59acjaI7Q&s',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5bmb41Qwm20XOXfzcj_hAJ3W_1NzqG-Z9QQ&s',
      'https://m.media-amazon.com/images/I/61RLLRapr7L._AC_UY1100_.jpg'
    ];

    console.log('Seeding products for all header subcategories...');

    const products = [];

    // ---------- TOPWEAR: T-SHIRTS ----------
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
      const isPrinted = sub === 'Printed T-Shirts';
      const isOversized = sub === 'Oversized T-Shirts';

      let categorySlug = 'men';
      if (isPrinted) categorySlug = 'printed';
      if (isOversized) categorySlug = 'oversized';

      for (let i = 1; i <= ITEMS_PER_SUB; i++) {
        const basePrice = 399 + (index % 3) * 50;
        const mrp = basePrice + 300;
        const sizes = isOversized
          ? ['M', 'L', 'XL']
          : ['S', 'M', 'L', 'XL'];
        const colors = ['Black', 'White', 'Navy', 'Olive'].slice(
          0,
          2 + (i % 2)
        );

        products.push({
          name: `${sub.replace('T-Shirts', 'Tee')} ${i}`,
          slug: `${sub.toLowerCase().replace(/\s+/g, '-')}-${i}`,
          description: `MetroMensWear ${sub.toLowerCase()} designed for daily metro runs.`,
          price: basePrice,
          mrp,
          category: catId(categorySlug),
          subCategory: sub,
          sizes,
          colors,
          stock: 20 + i * 3,
          images: [tshirtImages[(index + i) % tshirtImages.length]],
          isNewArrival: i === 1,
          isBestSeller: i === 2,
          isTrending: i === 3
        });
      }
    });

    // ---------- TOPWEAR: SHIRTS ----------
    const shirtSubcategories = [
      'Casual Shirts',
      'Plain Shirts',
      'Flannel Shirts',
      'Checked Shirts',
      'Cotton Shirts'
    ];

    shirtSubcategories.forEach((sub, index) => {
      for (let i = 1; i <= ITEMS_PER_SUB; i++) {
        const basePrice = 799 + (index % 2) * 50;
        const mrp = basePrice + 500;

        products.push({
          name: `${sub.replace('Shirts', 'Shirt')} ${i}`,
          slug: `${sub.toLowerCase().replace(/\s+/g, '-')}-${i}`,
          description: `Smart ${sub.toLowerCase()} for office days and weekend plans.`,
          price: basePrice,
          mrp,
          category: catId('shirts'),
          subCategory: sub,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['White', 'Blue', 'Olive', 'Black'].slice(
            0,
            2 + (i % 2)
          ),
          stock: 18 + i * 2,
          images: [shirtImages[(index + i) % shirtImages.length]],
          isNewArrival: i === 1,
          isBestSeller: index === 0 && i === 2,
          isTrending: index === 1 && i === 3
        });
      }
    });

    // ---------- TOPWEAR: POLOS ----------
    for (let i = 1; i <= ITEMS_PER_SUB; i++) {
      const basePrice = 599;
      const mrp = 999;

      products.push({
        name: `Metro Polo ${i}`,
        slug: `metro-polo-${i}`,
        description: 'Classic collared polo t-shirt with a clean metro fit.',
        price: basePrice + (i % 2) * 50,
        mrp,
        category: catId('men'),
        subCategory: 'Polos',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Black', 'White', 'Maroon', 'Navy'].slice(
          0,
          2 + (i % 2)
        ),
        stock: 25 + i * 2,
        images: [tshirtImages[i % tshirtImages.length]],
        isNewArrival: i === 1,
        isBestSeller: i === 3,
        isTrending: i === 4
      });
    }

    // ---------- WINTERWEAR ----------
    const winterSubs = ['Hoodies', 'Sweatshirts', 'Jackets'];

    winterSubs.forEach((sub, index) => {
      for (let i = 1; i <= ITEMS_PER_SUB; i++) {
        const basePrice = 1199 + index * 100;
        const mrp = basePrice + 600;

        products.push({
          name: `Metro ${sub.slice(0, -1)} ${i}`,
          slug: `metro-${sub.toLowerCase().slice(0, -1)}-${i}`,
          description: `Warm ${sub.toLowerCase()} layer for chilly metro evenings.`,
          price: basePrice,
          mrp,
          category: catId('winterwear'),
          subCategory: sub,
          sizes: ['M', 'L', 'XL'],
          colors: ['Black', 'Navy', 'Olive'].slice(
            0,
            2 + (i % 2)
          ),
          stock: 15 + i * 3,
          images: [winterImages[(index + i) % winterImages.length]],
          isNewArrival: i === 1,
          isBestSeller: i === 2,
          isTrending: index === 2 && i === 3
        });
      }
    });

    // ---------- BOTTOMWEAR ----------
    const bottomwearSubcategories = [
      'Cargo Joggers',
      'Cargo Pants',
      'Trousers',
      'Japanese Pants',
      'Gurkha Pants',
      'Korean Pants',
      'Pyjamas',
      'Jeans',
      'Shorts',
      'Boxers'
    ];

    bottomwearSubcategories.forEach((sub, index) => {
      for (let i = 1; i <= ITEMS_PER_SUB; i++) {
        const basePrice = 899 + (index % 3) * 100;
        const mrp = basePrice + 600;
        const waistSizes = ['28', '30', '32', '34', '36'];

        products.push({
          name: `Metro ${sub} ${i}`,
          slug: `metro-${sub.toLowerCase().replace(/\s+/g, '-')}-${i}`,
          description: `Comfort-first ${sub.toLowerCase()} tuned for city movement.`,
          price: basePrice,
          mrp,
          category: catId('bottomwear'),
          subCategory: sub,
          sizes: waistSizes.slice(0, 3 + (i % 2)),
          colors: ['Black', 'Olive', 'Khaki', 'Navy'].slice(
            0,
            2 + (i % 2)
          ),
          stock: 18 + i * 4,
          images: [bottomImages[(index + i) % bottomImages.length]],
          isNewArrival: i === 1,
          isBestSeller: index <= 2 && i === 2, // cargos/trousers
          isTrending: index >= 7 && i === 3 // jeans/shorts/boxers
        });
      }
    });

    // ---------- ADDITIONAL PRODUCTS: OVERSIZED TSHIRTS (COMBOS) ----------
    const oversizedComboImages = [
      'https://veirdo.in/cdn/shop/files/67_11.jpg?v=1758285223',
      'https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1740758781-mhl-mens-cloth-huckberry-749-67c1ded533637.jpg?crop=0.340xw:0.849xh;0.348xw,0.131xh&resize=980:*',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1Dc6bXhLuGlex7flAtBytAAdsFTf6SkZ5iA&s'
    ];

    const oversizedCombos = [
      {
        name: 'Oversized Combo Pack 1',
        slug: 'oversized-combo-pack-1',
        description: 'Combo of 3 oversized tees in different colors - perfect for layering and comfort.',
        price: 1199,
        mrp: 1799,
        category: catId('oversized'),
        subCategory: 'Oversized Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['Black', 'White', 'Navy'],
        stock: 25,
        images: [oversizedComboImages[0]],
        isNewArrival: true,
        isBestSeller: false,
        isTrending: true
      },
      {
        name: 'Oversized Combo Pack 2',
        slug: 'oversized-combo-pack-2',
        description: 'Combo of 2 oversized graphic tees - bold prints for street style.',
        price: 899,
        mrp: 1299,
        category: catId('oversized'),
        subCategory: 'Oversized Combo',
        sizes: ['L', 'XL'],
        colors: ['Black', 'Olive'],
        stock: 20,
        images: [oversizedComboImages[1]],
        isNewArrival: false,
        isBestSeller: true,
        isTrending: false
      },
      {
        name: 'Oversized Combo Pack 3',
        slug: 'oversized-combo-pack-3',
        description: 'Combo of 4 oversized tees - complete your wardrobe with versatile pieces.',
        price: 1599,
        mrp: 2399,
        category: catId('oversized'),
        subCategory: 'Oversized Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['White', 'Black', 'Navy', 'Grey'],
        stock: 15,
        images: [oversizedComboImages[2]],
        isNewArrival: true,
        isBestSeller: true,
        isTrending: true
      }
    ];

    // ---------- ADDITIONAL PRODUCTS: SHIRTS ----------
    const shirtComboImages = [
      'https://english.cdn.zeenews.com/sites/default/files/manian.jpg',
      'https://assets.ajio.com/medias/sys_master/root/20250416/CDZC/67ff5e1155340d4b4fde4c66/-473Wx593H-701227087-green-MODEL.jpg',
      'https://images-eu.ssl-images-amazon.com/images/I/71VIEe19U1L._AC_UL600_SR600,600_.jpg'
    ];

    const shirtCombos = [
      {
        name: 'Shirt Combo Pack 1',
        slug: 'shirt-combo-pack-1',
        description: 'Combo of 3 casual shirts - mix and match for office and casual wear.',
        price: 2299,
        mrp: 3299,
        category: catId('shirts'),
        subCategory: 'Shirt Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['White', 'Blue', 'Grey'],
        stock: 18,
        images: [shirtComboImages[0]],
        isNewArrival: true,
        isBestSeller: false,
        isTrending: true
      },
      {
        name: 'Shirt Combo Pack 2',
        slug: 'shirt-combo-pack-2',
        description: 'Combo of 2 formal shirts - perfect for professional meetings.',
        price: 1599,
        mrp: 2299,
        category: catId('shirts'),
        subCategory: 'Shirt Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['White', 'Light Blue'],
        stock: 22,
        images: [shirtComboImages[1]],
        isNewArrival: false,
        isBestSeller: true,
        isTrending: false
      },
      {
        name: 'Shirt Combo Pack 3',
        slug: 'shirt-combo-pack-3',
        description: 'Combo of 4 shirts in different patterns - versatile collection for any occasion.',
        price: 2999,
        mrp: 4299,
        category: catId('shirts'),
        subCategory: 'Shirt Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['White', 'Blue', 'Checked', 'Striped'],
        stock: 12,
        images: [shirtComboImages[2]],
        isNewArrival: true,
        isBestSeller: true,
        isTrending: true
      }
    ];

    // ---------- ADDITIONAL PRODUCTS: WINTERWEAR ----------
    const winterComboImages = [
      'https://static.10kya.com/media/catalog/product/cache/1/image/1080x/b05d625d6b6a602168d46abb7a406194/w/i/winter-thick-jackets-coats-maroon-1-winter-stylish-clothing-online-india-1100x1100_1_1.jpg',
      'https://assets.myntassets.com/dpr_1.5,q_30,w_400,c_limit,fl_progressive/assets/images/2025/APRIL/24/tjlztGaF_822d160dea33450c94a27cc17dfdaf4c.jpg',
      'https://5.imimg.com/data5/SELLER/Default/2023/9/347670384/QO/FZ/LG/198540386/mens-winter-wear-jackets.png'
    ];

    const winterCombos = [
      {
        name: 'Winterwear Combo Pack 1',
        slug: 'winterwear-combo-pack-1',
        description: 'Combo of hoodie and sweatshirt - stay warm in style during winter.',
        price: 2499,
        mrp: 3499,
        category: catId('winterwear'),
        subCategory: 'Winter Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['Black', 'Navy'],
        stock: 20,
        images: [winterComboImages[0]],
        isNewArrival: true,
        isBestSeller: false,
        isTrending: true
      },
      {
        name: 'Winterwear Combo Pack 2',
        slug: 'winterwear-combo-pack-2',
        description: 'Combo of jacket and hoodie - complete winter layering solution.',
        price: 3199,
        mrp: 4499,
        category: catId('winterwear'),
        subCategory: 'Winter Combo',
        sizes: ['L', 'XL'],
        colors: ['Black', 'Olive'],
        stock: 16,
        images: [winterComboImages[1]],
        isNewArrival: false,
        isBestSeller: true,
        isTrending: false
      },
      {
        name: 'Winterwear Combo Pack 3',
        slug: 'winterwear-combo-pack-3',
        description: 'Complete winter set - jacket, hoodie, and sweatshirt for ultimate comfort.',
        price: 4199,
        mrp: 5999,
        category: catId('winterwear'),
        subCategory: 'Winter Combo',
        sizes: ['M', 'L', 'XL'],
        colors: ['Black', 'Navy', 'Grey'],
        stock: 14,
        images: [winterComboImages[2]],
        isNewArrival: true,
        isBestSeller: true,
        isTrending: true
      }
    ];

    // Add all new combo products to the products array
    products.push(...oversizedCombos, ...shirtCombos, ...winterCombos);

    // Ensure every product has a `tags` array and populate sensible defaults
    products.forEach((p) => {
      if (!p.tags) {
        p.tags = [];
        if (p.subCategory) p.tags.push(p.subCategory);
        // add category name when available
        const catObj = categories.find((c) => c._id.toString() === p.category.toString());
        if (catObj && catObj.name) p.tags.push(catObj.name);
        p.tags = Array.from(new Set(p.tags.filter(Boolean)));
      }
    });

    // Add fallback products so that each category has at least 3 products
    const placeholderImage = 'https://via.placeholder.com/600x800?text=Metro';
    for (const cat of categories) {
      const catCount = products.filter((p) => p.category.toString() === cat._id.toString()).length;
      if (catCount < 3) {
        const need = 3 - catCount;
        for (let i = 1; i <= need; i++) {
          products.push({
            name: `${cat.name} Essentials ${i}`,
            slug: `${cat.slug}-essentials-${i}`,
            description: `Essential ${cat.name} piece - simple and versatile.`,
            price: 599,
            mrp: 999,
            category: cat._id,
            subCategory: `${cat.name} Essentials`,
            sizes: ['S', 'M', 'L'],
            colors: ['Black', 'White'],
            stock: 30,
            images: [placeholderImage],
            isNewArrival: i === 1,
            isBestSeller: i === 2,
            isTrending: i === 3,
            tags: [cat.name, 'essentials']
          });
        }
      }
    }

    console.log('Skipping product seeding. Existing products are preserved.');

    console.log('Seeding hero banners...');
    const heroBannersData = [
      {
        title: 'MetroMensWear',
        subtitle: 'Fresh fits for metro men – tees you’ll live in.',
        image: 'https://a.storyblok.com/f/165154/1280x720/9bcbd5f298/01_t-shirt-advertisement-strategies-header.jpg/m/',
        ctaPrimaryLabel: 'Shop Now',
        ctaPrimaryLink: '/products',
        ctaSecondaryLabel: 'Learn More',
        ctaSecondaryLink: '/about',
        order: 1,
        isActive: true
      },
      {
        title: 'Premium Quality',
        subtitle: 'Handcrafted with care for the modern gentleman',
        image: 'https://www.truefittandhill.com/cdn/shop/articles/Bearded_model_lifestyle_1024x1024.png?v=1670268041',
        ctaPrimaryLabel: 'Explore Collection',
        ctaPrimaryLink: '/products',
        ctaSecondaryLabel: 'Our Story',
        ctaSecondaryLink: '/about',
        order: 2,
        isActive: true
      },
      {
        title: 'Timeless Elegance',
        subtitle: 'Classic pieces that never go out of style',
        image: 'https://www.bewakoof.com/blog/wp-content/uploads/2021/01/Blog-Feature-Banner_Shirts-Every-Man-Should-Own.jpg',
        ctaPrimaryLabel: 'View Catalog',
        ctaPrimaryLink: '/products',
        ctaSecondaryLabel: 'Contact Us',
        ctaSecondaryLink: '/contact',
        order: 3,
        isActive: true
      }
    ];

    await HeroBanner.insertMany(heroBannersData);

    console.log('Seeding exclusive banners...');
    const exclusiveBannersData = [
      {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/menswear-fashion-suits-advertisement-design-template-2812cdd0ac83993cdc36013874e57e8f_screen.jpg?ts=1637027425',
        link: '/products?bestseller=true',
        order: 1,
        isActive: true
      },
      {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://i.pinimg.com/736x/c3/a3/ee/c3a3ee024527c90d35d3a8d7def887a4.jpg',
        link: '/products?isNewArrival=true',
        order: 2,
        isActive: true
      },
      {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://i.pinimg.com/736x/af/eb/a8/afeba81b52250d2165772cd0e090c411.jpg',
        link: '/products?trending=true',
        order: 3,
        isActive: true
      },
      {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://i.pinimg.com/236x/ee/c8/5f/eec85f89d360b41e587a680ae18f51ee.jpg',
        link: '/products?bestseller=true',
        order: 4,
        isActive: true
      },
       {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/men%27s-fashion-design-template-76d21ea7e1c5b8f6704372ad4379f407_screen.jpg?ts=1758870717',
        link: '/products?isNewArrival=true',
        order: 5,
        isActive: true
      },
       {
        title: 'Title here',
        subtitle: 'Subtitle here',
        image: 'https://templates.simplified.co/thumb/4b4eb011-8d15-4da1-902a-dc0c776cbd86.jpg',
        link: '/products?isNewArrival=true',
        order: 5,
        isActive: true
      }
    ];

    await ExclusiveBanner.insertMany(exclusiveBannersData);

    console.log('✅ Seed complete!');
    console.log('Login with: admin@bullrise / Admin@123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seed();
