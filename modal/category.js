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
    
    createdAt:{
        type:Date,
        default:Date.now
    }
})

module.exports = mongoose.model("Category",categorySchema);