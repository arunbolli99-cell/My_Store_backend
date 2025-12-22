const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      productId: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  address: {
    street: String,
    city: String,
    pincode: String,
    state: String,
    country: String
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "Card", "UPI"],
    default: "COD"
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending"
  },

  orderStatus: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);