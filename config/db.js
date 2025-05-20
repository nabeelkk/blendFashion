const mongoose = require('mongoose');

const connectDb = async()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDb connected");
    } catch (error) {
        console.error('MongoDb connection failed',error)
    }
}

module.exports = connectDb;