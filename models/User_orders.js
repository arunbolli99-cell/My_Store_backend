const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId_products: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "New_User",
    required: true
  },

  products_items: [
    {
      productId: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],

  totalAmount: {
    type: Number,
    required: true
  },

  address: {
    type: Object,
    required: true
  },

  paymentMethod: {
    type: String,
    required: true
  },

  orderId: {
    type: String,
    required: true
  },

  orderDate: {
    type: Date,
    required: true
  },

  paymentDetails: {
    type: Object,
    default: {}
  },

  status: {
    type: String,
    default: "Pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("User_orders", OrderSchema);
