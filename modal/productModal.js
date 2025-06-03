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
    brand:{
        type:String,
        

    },
    sizes:{
        
        small:{
            Mrp:{
                type:Number,

            },
            amount:{
                type: Number,
  
            },
            quantity:{
                type: Number,
            }
        },
        medium:{
            Mrp:{
                type:Number,

            },
            amount:{
                type: Number,

            },
            quantity:{
                type: Number,
            }
            
        },
        large:{
            Mrp:{
                type:Number,

            },
            amount:{
                type: Number,
  
            },
            quantity:{
                type: Number,
            }
            
        },
        XL:{
            Mrp:{
                type:Number,

            },
            amount:{
                type: Number,

            },
            quantity:{
                type: Number,
            }
            
        }
    },
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
    
    images:{
        type:[String],
        validate:[arrayLimit,'{path} Must have atleast 3 images']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
      },
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

},{timestamps:true})

function arrayLimit(val){
    return val.length>=3
}

module.exports = mongoose.model('Products',productSchema)