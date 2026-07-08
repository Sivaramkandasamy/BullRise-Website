const express=require("express");

const router=express.Router();

const {

createReview,

getProductReviews,

getAllReviews,

approveReview,

rejectReview,

replyReview,

deleteReview

}=require("../controllers/reviewController");

const {protect,adminOnly}=require("../middleware/authMiddleware");

router.post("/",protect,createReview);

router.get("/product/:productId",getProductReviews);

router.get("/admin",protect,adminOnly,getAllReviews);

router.put("/approve/:id",protect,adminOnly,approveReview);

router.put("/reject/:id",protect,adminOnly,rejectReview);

router.put("/reply/:id",protect,adminOnly,replyReview);

router.delete("/:id",protect,adminOnly,deleteReview);

module.exports=router;