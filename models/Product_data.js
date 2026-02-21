
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_id: Number,
  title: String,
  category: String,
  price: Number,
  image: String,
  description: String,
  instock: Boolean,
  rating: Number
});

module.exports = mongoose.model("Product", productSchema, "products_data");
