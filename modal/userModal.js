const mongoose = require('mongoose');
 
const addressSchema = new mongoose.Schema({
    _id:false,
    id:{
        type:mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    addressName:{
        type:String
    },
    firstName:{
        type:String,
    },
    lastName:{
        type:String
    },
    phoneNumber:{
        type:String
    },
    addressLine:{
        type:String
    },
    city:{
        type:String
    },
    state:{
        type:String
    },
    zipCode:{
        type:String
    },
    shipping:{
        type:Boolean,
        default:false
    },
    billing:{
        type:Boolean,
        default:false
    },
    deliveryInstructions:{
        type:String
    },
    isDefault:{
        type:Boolean,
        default:false
    }

})
const userSchema = new mongoose.Schema({
    googleId:{
        type:String,
        unique:true,
        sparse: true,
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        
    },
    mobile:{
        type:String,
        
    },
    address:[addressSchema],
    isBlocked:{
        type:Boolean,
        default:false
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    profileImg:{
        url: String,
        public_id: String
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    otp:{
        type:String
    },
    otpExpr:{
        type:Date
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    resetToken:{
        type:String
    },
    resetTokenExpr:{
        type:String
    },
    referralCode: { type: String, unique: true,sparse: true, },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

},{timestamps:true})



const User = mongoose.model("User",userSchema);
module.exports = User