const mongoose = require('mongoose');



const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number, default: 0 },
    transactions: [
      {
        amount: {
          type: Number
        },
        type: {
          type: String
        }, 
        description: {
          type: String
        },
        date: { type: Date, default: Date.now }
      }
    ]
  });
  
  module.exports = mongoose.model('Wallet', walletSchema);