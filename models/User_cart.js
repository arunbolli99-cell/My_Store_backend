const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  products_items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product",   
        required: true
      },
      title: {
        type: String,
      },
      category: {
        type: String,
      },
      image: {
        type: String,
      },
      description: {
        type: String,
      },
      instock: {
        type: Boolean,
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
  }

}, { timestamps: true });

module.exports = mongoose.model("User_cart", CartSchema);
