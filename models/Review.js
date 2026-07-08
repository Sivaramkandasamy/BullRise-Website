const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
{
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"TextileProduct",
        required:true
    },

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    customerName:{
        type:String,
        required:true
    },

    rating:{
        type:Number,
        required:true,
        min:1,
        max:5
    },

    title:{
        type:String,
        trim:true
    },

    comment:{
        type:String,
        required:true
    },

    images:[
        {
            type:String
        }
    ],

    verifiedPurchase:{
        type:Boolean,
        default:false
    },

    status:{
        type:String,
        enum:["Pending","Approved","Rejected"],
        default:"Pending"
    },

    adminReply:{
        type:String,
        default:""
    }

},
{
    timestamps:true
});

reviewSchema.index(
{
    product:1,
    user:1
},
{
    unique:true
});

module.exports=mongoose.model("Review",reviewSchema);