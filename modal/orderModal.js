const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true },
  orderId: { type: String, unique: true },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products',required:true },
      productName:String,
      quantity: Number,
      price: Number,
      size: String,
      status: { type: String,
        default: 'Placed',
        enum: ['Placed', 'Cancelled','Pending', 'Returned', 'Delivered','Out of Delivery','Shipped','Return Processing'] },
    }
  ],
  returnRequested: { type: Boolean, default: false },
  returnVerified: { type: Boolean, default: false },
  returnReason: String,
  totalAmount: Number,
  totalDiscount:Number,
  paymentMethod: String,
  paymentStatus:{
    type:String,
    default:"false"
  },
  razorPayId:{type: String},
  coupon:String,
  paymentIntentId: String,
  status:{
    type:String,  
    default: 'Placed',
    enum: ['Placed', 'Cancelled','Pending', 'Returned', 'Delivered','Out of Delivery','Shipped']
  },
  reason:String,
  changeStatus:{
    type:Boolean,
    default:false
  },
  address: {
    firstName: String,
    addressName:String,
    phoneNumber: String,
    zipCode: String,
    state: String,
    city: String,
    addressLine: String,
  },
  
},{timestamps:true});

module.exports = mongoose.model('Order', orderSchema);
