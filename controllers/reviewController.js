const asyncHandler = require("express-async-handler");

const Review = require("../models/Review");
const TextileProduct = require("../models/TextileProduct");

const Order = require("../models/Order");

const createReview = asyncHandler(async (req, res) => {

    // ❌ Admin cannot review
    if (req.user.isAdmin) {
        res.status(403);
        throw new Error("Admins cannot submit reviews");
    }

    const { product, rating, title, comment } = req.body;

    // ✅ Product exists?
    const textileProduct = await TextileProduct.findById(product);

    if (!textileProduct) {
        res.status(404);
        throw new Error("Product not found");
    }

    // ✅ Already reviewed?
    const already = await Review.findOne({
        product,
        user: req.user._id
    });

    if (already) {
        res.status(400);
        throw new Error("You have already reviewed this product");
    }

    // ✅ User purchased this product?
    const hasPurchased = await Order.findOne({
        user: req.user._id,
        isPaid: true,
        orderItems: {
            $elemMatch: {
                product: textileProduct._id,
                productModel: "TextileProduct"
            }
        }
    });

    if (!hasPurchased) {
        res.status(400);
        throw new Error(
            "Only customers who purchased this product can review it"
        );
    }

    // ✅ Create Review
    const review = await Review.create({
        product: textileProduct._id,
        user: req.user._id,
        customerName: req.user.name,
        rating,
        title,
        comment,
        verifiedPurchase: true,
        status: "Pending"
    });

    res.status(201).json(review);
});

const updateProductRating = async (productId) => {

    const reviews = await Review.find({
        product: productId,
        status: "Approved"
    });

    const totalReviews = reviews.length;

    const averageRating =
        totalReviews === 0
            ? 0
            : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await TextileProduct.findByIdAndUpdate(productId, {
        averageRating,
        totalReviews
    });

};

const getProductReviews = asyncHandler(async (req, res) => {

    const reviews = await Review.find({

        product: req.params.productId,

        status: "Approved"

    })
        .sort({ createdAt: -1 });

    res.json(reviews);

});

const approveReview = asyncHandler(async (req, res) => {

    const review = await Review.findById(req.params.id);

    if (!review) {

        res.status(404);

        throw new Error("Review not found");

    }

    review.status = "Approved";

    await review.save();

    await updateProductRating(review.product);

    res.json(review);

});

const rejectReview = asyncHandler(async (req, res) => {

    const review = await Review.findById(req.params.id);

    if (!review) {

        res.status(404);

        throw new Error("Review not found");

    }

    review.status = "Rejected";

    await review.save();

    await updateProductRating(review.product);

    res.json(review);

});

const replyReview = asyncHandler(async (req, res) => {

    const review = await Review.findById(req.params.id);

    if (!review) {

        res.status(404);

        throw new Error("Review not found");

    }

    review.adminReply = req.body.reply;

    await review.save();

    res.json(review);

});

const deleteReview = asyncHandler(async (req, res) => {

    const review = await Review.findById(req.params.id);

    if (!review) {

        res.status(404);

        throw new Error("Review not found");

    }

    const productId = review.product;

    await review.deleteOne();

    await updateProductRating(productId);

    res.json({

        message: "Review Deleted"

    });

});

const getAllReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find()
        .populate("product")
        .populate("user")
        .sort({ createdAt: -1 });

    console.log(JSON.stringify(reviews, null, 2));

    res.json(reviews);
});


module.exports = {
    createReview,
    getProductReviews,
    getAllReviews,
    approveReview,
    rejectReview,
    replyReview,
    deleteReview
};