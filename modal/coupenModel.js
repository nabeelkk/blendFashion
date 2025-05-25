const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    couponcode:{
        type:String,
        uppercase:true,
        unique:true,
        default:generateCouponCode,
    },
    discount:{
        type:Number,
        required:true
    },
    // maxdiscount:{
    //     type:Number,
    //     required:true
    // },
    expiryDate:{
        type:Date,
        required:true
    },
    minPurchase:{
        type:Number,
        required:true
    },
    user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive:{
        type:Boolean,
        default:true
    }

});

function generateCouponCode(){
    const length = 8;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let couponCode = '';
    for(let i = 0;i<length;i++){
        const randomIndex = Math.floor(Math.random()*characters.length);
        couponCode += characters.charAt(randomIndex);
    }
    return couponCode
}


module.exports = mongoose.model('Coupon',couponSchema)