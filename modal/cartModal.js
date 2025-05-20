const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    products:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Products',
                required:true
            },
            quantity:{
                type:Number,
                default:1,
                min:1
            },
            size:{
                type: String,
                required: true
            },
            price:{
                type: Number,
                required: true
            },
            regularPrice:{
                type:Number,
                required:true
            },
            discount:{
                type:Number
            },
        }
    ]
})
module.exports = mongoose.model('Cart',cartSchema)