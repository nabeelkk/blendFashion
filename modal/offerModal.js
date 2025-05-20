const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['product', 'category'],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: function () {
      return this.type === 'product';
    },
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function () {
      return this.type === 'category';
    },
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100, 
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);