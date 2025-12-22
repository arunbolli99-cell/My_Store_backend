const User = require('../Models/User');
const Cart = require('../Models/User_cart');
const Order = require('../Models/Order');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

// ------------------- EMAIL TRANSPORT -------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "arunkumarbolli282@gmail.com",
    pass: "wzpbgboshdykqdid"
  }
});

// ------------------- SEND EMAIL FUNCTION -------------------
async function sendRegistrationEmail(toEmail, firstName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Registration Successful!",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Welcome to MY STORE</title>
  <style>
    body { margin:0; padding:0; background:#f6f6f6; font-family:Arial, sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; padding:30px; border-radius:6px; }
    .header { text-align:center; }
    .header img { max-width:150px; }
    .title { font-size:24px; font-weight:bold; margin-top:20px; color:#333; }
    .subtitle { font-size:16px; color:#555; margin:10px 0 20px; }
    .coupon-box { background:#f9f1e5; padding:15px; text-align:center; border-radius:6px; margin:20px 0; }
    .coupon-code { font-size:22px; font-weight:bold; color:#333; letter-spacing:2px; }
    .cta-btn {
      display:inline-block;
      background:#007bff;
      color:#ffffff;
      padding:12px 30px;
      border-radius:5px;
      text-decoration:none;
      font-size:16px;
      margin-top:20px;
    }
    .features { margin:20px 0; padding-left:20px; color:#444; }
    .footer { font-size:12px; color:#888; text-align:center; margin-top:30px; }
    @media (max-width:600px) {
      .container { padding:20px; }
      .title { font-size:22px; }
      .coupon-code { font-size:20px; }
      .cta-btn { width:100%; text-align:center; }
    }
  </style>
</head>
<body>

<div class="container">
  <div class="header">
    <!-- OPTIONAL LOGO -->
    <!-- <img src="https://example.com/logo.png" alt="{{store}}"/> -->
    <div class="title">Welcome to MY STORE, {{firstName}} 🎉</div>
    <div class="subtitle">Thanks for joining us! You’re all set to start shopping.</div>
  </div>

  <div class="coupon-box">
    <div>Here’s a special welcome gift:</div>
    <div class="coupon-code">WELCOME10</div>
    <div>Get <strong>10% OFF</strong> on your first purchase</div>
  </div>

  <div style="text-align:center;">
    <a href="{{shop_url}}" class="cta-btn">Start Shopping</a>
  </div>

  <ul class="features">
    <li>Exclusive deals every day</li>
    <li>Fast & secure checkout</li>
    <li>Easy returns and refunds</li>
    <li>Track orders in real-time</li>
  </ul>

  <p style="color:#555; margin-top:20px;">
    If you have any questions, feel free to reply to this email.
  </p>

  <div class="footer">
    © {{2026}} MY STORE — All rights reserved.  
    <br/><br/>
    If you didn’t create this account, please ignore this email.
  </div>
</div>

</body>
</html>

    `
  };

  return transporter.sendMail(mailOptions);
}

const newUser = async (req, res) => {
  try {
    console.log(req.body);

    const { firstName, lastName, email, phone, password } = req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ 
      firstName, 
      lastName, 
      email, 
      phone, 
      password: hashedPassword 
    });
    await user.save();

    try {
      console.log(`Attempting to send registration email to: ${email}`);
      await sendRegistrationEmail(email, firstName);
      console.log(`Registration email sent successfully to: ${email}`);
      return res.status(201).json({ message: "User created & email sent!" });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return res.status(201).json({ message: "User created, but email failed to send" });
    }

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// ------------------- LOGIN -------------------
const userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const checkPass = await bcrypt.compare(password, user.password);
    if (!checkPass)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: "Login successful",
      token: token,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------- ADD ITEM TO CART -------------------
const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, quantity, price } = req.body;

    if (!productId || !quantity || price === undefined) {
      return res.status(400).json({ error: "Missing required fields: productId, quantity, price" });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    if (price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    let cart = await Cart.findOne({ userId });

    if (cart) {
      const existingItem = cart.items.find(item => item.productId === productId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, price });
      }
    } else {
      cart = new Cart({
        userId,
        items: [{ productId, quantity, price }]
      });
    }

    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();

    res.status(200).json({
      message: "Item added to cart successfully",
      cart
    });

  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
};

// ------------------- SEND MAIL (optional extra API) -------------------
const sendmail = async (req, res) => {
  try {
    const { email, firstName } = req.body;

    await sendRegistrationEmail(email, firstName);

    res.json({ message: "Mail sent!" });

  } catch (error) {
    console.error("Send mail error:", error);
    res.status(500).json({ error: "Mail sending failed" });
  }
};

// ------------------- GET USER CART -------------------
const getCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        message: "Cart is empty",
        cart: null,
        items: [],
        totalAmount: 0
      });
    }

    res.status(200).json({
      message: "Cart retrieved successfully",
      cart
    });

  } catch (error) {
    console.error("Get Cart Error:", error);
    res.status(500).json({ error: "Failed to retrieve cart" });
  }
};

// ------------------- CLEAR CART -------------------
const clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await Cart.findOneAndDelete({ userId });

    if (!result) {
      return res.status(200).json({ message: "Cart was already empty" });
    }

    res.status(200).json({
      message: "Cart cleared successfully"
    });

  } catch (error) {
    console.error("Clear Cart Error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
};

// ------------------- REMOVE ITEM FROM CART -------------------
const removeItemFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await cart.save();

    res.status(200).json({
      message: "Item removed from cart successfully",
      cart
    });

  } catch (error) {
    console.error("Remove Item from Cart Error:", error);
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
};

// ------------------- PLACE ORDER (Convert cart to order) -------------------
const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { address, paymentMethod } = req.body;

    if (!address || !paymentMethod) {
      return res.status(400).json({ error: "Missing required fields: address, paymentMethod" });
    }

    if (!["COD", "Card", "UPI"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const newOrder = new Order({
      userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
      address,
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
      orderStatus: "Pending"
    });

    const savedOrder = await newOrder.save();

    await Cart.findOneAndDelete({ userId });

    res.status(201).json({
      message: "Order placed successfully",
      order: savedOrder
    });

  } catch (error) {
    console.error("Place Order Error:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
};

// ------------------- GET USER ORDERS -------------------
const getOrders = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Orders retrieved successfully",
      orders
    });

  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ error: "Failed to retrieve orders" });
  }
};

// ------------------- EXPORT -------------------
module.exports = {
  newUser,
  userlogin,
  sendmail,
  sendRegistrationEmail,
  addToCart,
  getCart,
  clearCart,
  removeItemFromCart,
  placeOrder,
  getOrders
};
