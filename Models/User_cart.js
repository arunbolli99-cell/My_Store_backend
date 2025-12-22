const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
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
    default: 0,
    min: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);
