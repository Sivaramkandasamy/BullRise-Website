require('dotenv').config();
const mongoose = require('mongoose');
const ExclusiveBanner = require('../models/ExclusiveBanner');
const connectDB = require('../config/db');

const test = async () => {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        console.log('Fetching banners...');
        const banners = await ExclusiveBanner.find({}).sort({ order: 1 });
        console.log('Banners found:', banners.length);
        console.log(JSON.stringify(banners, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
};

test();
