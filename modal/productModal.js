const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
    
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true,
        
    },
    brand:{
        type:String,
        

    },
    price:{
        seller:{
            type:Number,
            required:true
        }
    },
    sizes:{
        
        small:{
            amount:{
                type: Number,
                required: true
            },
            quantity:{
                type: Number,
            }
        },
        medium:{
            amount:{
                type: Number,
                required: true
            },
            quantity:{
                type: Number,
            }
            
        },
        large:{
            amount:{
                type: Number,
                required: true
            },
            quantity:{
                type: Number,
            }
            
        }
    },
    
    images:{
        type:[String],
        validate:[arrayLimit,'{path} Must have atleast 3 images']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
      },
    stock: Number,
    rating: Number,

    isdeleted:{
        type:Boolean,
        default:false
    },
    isListed:{
        type:Boolean,
        default:true
    },
    reviews: [
        {
        userName: String,
        rating: Number,
        comment: String
        }
    ],
    appliedCoupon: String,
    offer:{
        discount:{
            type:Number
        },
        startDate:{
            type:String
        },
        endDate:{
            type:String
        },
        isActive:{
            type:Boolean,
            default:true
        }
    },
    offerExpiry: {
        type: Date,
        default: null
    }

},{timestamps:true})

function arrayLimit(val){
    return val.length>=3
}

module.exports = mongoose.model('Products',productSchema)