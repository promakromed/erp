const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    // Basic product information
    itemNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    alternateDescription: {
      type: String,
      required: false,
    },
    
    // Product specifications
    size: {
      type: String,
      required: false,
    },
    unit: {
      type: String,
      required: false,
    },
    weight: {
      type: Number,
      required: false,
    },
    weightUnit: {
      type: String,
      required: false,
    },
    
    // Product categorization
    manufacturer: {
      type: String,
      required: false,
    },
    brand: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
    },
    subcategory: {
      type: String,
      required: false,
    },
    
    // Customs and regulatory information
    hsCode: {
      type: String,
      required: false,
    },
    countryOfOrigin: {
      type: String,
      required: false,
    },
    regulatoryInfo: {
      type: Map,
      of: String,
      required: false,
    },
    
    // Supplier offers with pricing information (references Supplier model)
    supplierOffers: [
      {
        supplier: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Supplier', // Links to the Supplier model
          required: true
        },
        supplierItemNo: { // Specific to this product-supplier link
          type: String,
          required: false,
        },
        price: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: 'USD',
        },
        catalogNo: { // Specific to this product-supplier link
          type: String,
          required: false,
        },
        leadTime: {
          type: String,
          required: false,
        },
        minOrderQty: {
          type: Number,
          required: false,
          default: 1,
        },
        discountTiers: [
          {
            quantity: Number,
            price: Number,
          }
        ],
        lastUpdated: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    
    // Pricing and margin information
    sellingPrice: {
      type: Number,
      required: false,
    },
    defaultMargin: {
      type: Number,
      default: 1.3, // 30% margin by default
      required: false,
    },
    pricingNotes: {
      type: String,
      required: false,
    },
    
    // Inventory information
    inStock: {
      type: Number,
      required: false,
      default: 0,
    },
    reorderPoint: {
      type: Number,
      required: false,
    },
    location: {
      type: String,
      required: false,
    },
    
    // Additional custom fields
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      required: false,
    },
    
    // Document attachments (datasheets, images, etc.)
    attachments: [
      {
        name: String,
        fileType: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    
    // Status and visibility
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Add text index for search functionality
productSchema.index({ 
  itemNo: 'text', 
  description: 'text', 
  alternateDescription: 'text',
  manufacturer: 'text',
  brand: 'text',
  hsCode: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

