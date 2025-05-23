const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['product', 'category'],
    required: true,
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function () {
      return this.type === 'category';
    }
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
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
