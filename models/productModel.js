const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    itemNo: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    mrsPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    mizalaPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    winner: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create text index for search
productSchema.index({ itemNo: 'text', description: 'text', brand: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
