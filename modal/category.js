const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    description:{
        type:String,
        required:true,
        trim:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    offer:{
        discount: {
            type: Number,
            required: true,
            min: 0,
            max: 100, 
        },
        startDate: {
            type: Date,
            required: true,
            validate: {
            validator: function (v) {
                return v < this.endDate; 
            },
            message: 'Start date must be before end date'
            }
        },

        endDate: {
            type: Date,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    }
})

module.exports = mongoose.model("Category",categorySchema);