const User = require('../models/New_user');
const Cart = require('../models/User_cart');
const Order = require('../models/User_orders');
const JWT = require('jsonwebtoken');
const Dotenv = require('dotenv');
const Products = require('../models/Product_data');
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const crypto = require("crypto");

Dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
// ------------------- GET PRODUCTS -------------------

const products = async (req, res) => {
  try {
    const products = await Products.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// ------------------- EMAIL TRANSPORT -------------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Helps with some cloud environment network issues
  }
});

// ------------------- SEND EMAIL FUNCTION -------------------
async function sendRegistrationEmail(toEmail, firstName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Registration Successful!",
    html: `
      <h2>Welcome ${firstName} 🎉</h2>
      <p>Your account has been created successfully.</p>
      <p>Thank you for joining My Store!</p>
      <hr/>
      <p>This is an automated message, please do not reply.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

// ------------------- SEND ORDER CONFIRMATION EMAIL -------------------
async function sendOrderConfirmationEmail(toEmail, orderDetails) {
  const { orderId, products_items, totalAmount, paymentMethod, address } = orderDetails;

  const itemsHtml = products_items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">₹ ${item.price}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `Order Confirmed - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #4CAF50; text-align: center;">Order Placed Successfully! 🎉</h2>
        <p>Hi,</p>
        <p>Thank you for your order. We're happy to let you know that we've received your order.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Delivery Address:</strong> ${address.address}, ${address.city}, ${address.state} - ${address.pincode}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: left;">Qty</th>
              <th style="padding: 10px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px;">
          <h3>Total Amount: ₹ ${totalAmount.toFixed(2)}</h3>
        </div>

        <p>We'll notify you once your order is shipped.</p>
        <hr/>
        <p style="font-size: 12px; color: #777;">Thank you for shopping with My Store!</p>
      </div>
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


// ------------------- LOGIN HELPER -------------------
const completeLoginResponse = async (user, res) => {
  const token = JWT.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  const userCart = await Cart.findOne({ userId: user._id });
  let userOrders = await Order.find({ userId_products: user._id }).lean();

  if (userOrders && userOrders.length > 0) {
    const productIds = [];
    userOrders.forEach(order => {
      if (order.products_items) {
        order.products_items.forEach(item => {
          productIds.push(item.productId);
        });
      }
    });

    const productsData = await Products.find({ product_id: { $in: productIds } }).lean();

    const productMap = {};
    productsData.forEach(p => {
      productMap[p.product_id] = p;
    });

    userOrders = userOrders.map(order => {
      const enrichedItems = order.products_items.map(item => {
        const product = productMap[item.productId];
        return {
          ...item,
          title: product ? product.title : "Unknown Product",
          image: product ? product.image : "",
          category: product ? product.category : ""
        };
      });
      return { ...order, products_items: enrichedItems };
    });
  }

  return res.status(200).json({
    message: "Login successful",
    token,
    userId: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    addresses: user.addresses || [],
    cart: userCart,
    orders: userOrders
  });
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

    await completeLoginResponse(user, res);

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------- CART SAVE -------------------


const addCart = async (req, res) => {
  try {

    const userId = req.user.userId; // from auth middleware
    const { productId, quantity } = req.body; // productId should be the ObjectId string

    console.log("Decoded user:", req.user);


    // Find product by _id (ObjectId)
    const product = await Products.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Find user's cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId: userId,
        products_items: [],
        totalAmount: 0
      });
    }

    // Check if product already exists in cart
    const existingItem = cart.products_items.find(
      item => item.productId.toString() === product._id.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.products_items.push({
        productId: product._id,
        title: product.title,
        category: product.category,
        image: product.image,
        description: product.description,
        instock: product.instock,
        quantity,
        price: product.price
      });
    }

    // Update total
    cart.totalAmount = cart.products_items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();
    res.status(200).json({ message: "Cart updated", cart });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};



const getCart = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "products_items.productId",
        model: "Product"
      });
    // optional: populate product details

    if (!cart) {
      return res.status(200).json({
        message: "Cart is empty",
        cart: {
          products_items: [],
          totalAmount: 0
        }
      });
    }

    res.status(200).json({
      message: "Cart fetched successfully",
      cart
    });

  } catch (error) {
    console.error("Get Cart Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.products_items.find(
      item => item.productId.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ error: "Product not in cart" });
    }

    // Optional: check stock from DB
    const product = await Products.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Update quantity
    item.quantity = quantity;

    // Recalculate total
    cart.totalAmount = cart.products_items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully",
      cart
    });

  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cartItemId } = req.params; // <-- changed

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cart.products_items.findIndex(
      item => item._id.toString() === cartItemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    // Remove item
    cart.products_items.splice(itemIndex, 1);

    // Delete cart if empty
    if (cart.products_items.length === 0) {
      await Cart.deleteOne({ userId });
      return res.status(200).json({ message: "Cart is empty and deleted" });
    }

    // Recalculate total
    cart.totalAmount = cart.products_items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();

    res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    console.error("Remove Cart Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.products_items = [];
    cart.totalAmount = 0;

    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart
    });

  } catch (error) {
    console.error("Clear Cart Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};



// // ------------------- SEND MAIL (optional extra API) -------------------
// const sendmail = async (req, res) => {
//   try {
//     const { email, firstName } = req.body;
//
//     await sendRegistrationEmail(email, firstName);
//
//     res.json({ message: "Mail sent!" });
//
//   } catch (error) {
//     console.error("Send mail error:", error);
//     res.status(500).json({ error: "Mail sending failed" });
//   }
// };

// ------------------- PLACE ORDER -------------------
const placeOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    let {
      order_items,
      products_items,
      items,
      order_total,
      totalAmount,
      order_address,
      address,
      order_payment,
      paymentMethod,
      order_date,
      orderDate,
      order_id,
      orderId
    } = req.body;

    // Normalize keys
    let finalItems = order_items || products_items || items;
    let finalTotal = order_total || totalAmount;
    const finalAddress = order_address || address;
    const finalPayment = order_payment || paymentMethod;
    const finalOrderId = order_id || orderId;
    const finalDate = order_date || orderDate || new Date();
    const paymentStatus = req.body.paymentStatus;
    const userEmail = req.body.email || req.user.email;
    const transactionDetails = req.body.transactionDetails;

    // Payment Validation
    if (finalPayment !== 'cod') {
      if (!transactionDetails || (!transactionDetails.verifiedAutomatically && !transactionDetails.transactionId)) {
        return res.status(400).json({ error: "Order failed: Payment not verified" });
      }
    }

    console.log("Incoming order request for user:", userId);
    console.log("Payload:", JSON.stringify(req.body, null, 2));

    // Fallback to cart if items are missing
    if (!finalItems || finalItems.length === 0) {
      console.log("No items in payload, attempting fallback to User_cart");
      const cart = await Cart.findOne({ userId });
      if (cart && cart.products_items && cart.products_items.length > 0) {
        console.log(`Found ${cart.products_items.length} items in cart`);
        finalItems = cart.products_items;
        if (!finalTotal) finalTotal = cart.totalAmount;
      }
    }

    if (!finalItems || finalItems.length === 0) {
      return res.status(400).json({ error: "Invalid order data: No items found in payload or cart" });
    }

    if (!finalAddress) {
      return res.status(400).json({ error: "Missing shipping address" });
    }

    if (!finalOrderId) {
      return res.status(400).json({ error: "Missing order ID" });
    }

    // Process items and ensure numeric product IDs for the Order model
    // The Order model expects productId: Number (the numeric ID from Product collection)
    const processedItems = [];
    for (const item of finalItems) {
      let numericId = item.productId;

      // If productId looks like an ObjectId (string or object), we might need to find the numeric ID
      if (typeof numericId === 'string' && numericId.length === 24) {
        const prod = await Products.findById(numericId);
        if (prod) numericId = prod.product_id;
      } else if (numericId && typeof numericId === 'object' && numericId._id) {
        // Handle cases where item might be a populated object
        const prod = await Products.findById(numericId._id);
        if (prod) numericId = prod.product_id;
      }

      processedItems.push({
        productId: numericId,
        quantity: item.quantity,
        price: item.price
      });
    }

    const newOrder = new Order({
      userId_products: userId,
      products_items: processedItems,
      totalAmount: finalTotal,
      address: finalAddress,
      paymentMethod: finalPayment || 'Cash on Delivery',
      orderId: finalOrderId,
      orderDate: finalDate,
      paymentDetails: transactionDetails || {}
    });

    const savedOrder = await newOrder.save();
    console.log("Order saved successfully:", savedOrder._id);

    // Clear the cart
    try {
      await Cart.deleteOne({ userId });
      console.log("Cart cleared for user:", userId);
    } catch (cartErr) {
      console.error("Non-critical error clearing cart:", cartErr);
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: savedOrder
    });

    // Send Confirmation Email
    try {
      if (userEmail) {
        // We need to fetch titles for the email if they aren't in processedItems
        const enrichedItemsForEmail = await Promise.all(processedItems.map(async item => {
          const product = await Products.findOne({ product_id: item.productId });
          return {
            ...item,
            title: product ? product.title : "Product"
          };
        }));

        await sendOrderConfirmationEmail(userEmail, {
          ...savedOrder.toObject(),
          products_items: enrichedItemsForEmail
        });
        console.log("Order confirmation email sent to:", userEmail);
      }
    } catch (emailErr) {
      console.error("Non-critical error sending order email:", emailErr);
    }

  } catch (error) {
    console.error("Place Order detailed error:", error);
    res.status(500).json({ error: "Failed to place order: " + error.message });
  }
};


// ------------------- CANCEL ORDER -------------------
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Cancelling order:", orderId);

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Find and remove the order from the database
    const deletedOrder = await Order.findOneAndDelete({ orderId });

    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Order cancelled successfully",
      orderId: orderId
    });

  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
};


// ------------------- GET ORDERS -------------------
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    let userOrders = await Order.find({ userId_products: userId }).sort({ createdAt: -1 }).lean();

    if (userOrders && userOrders.length > 0) {
      const productIds = [];
      userOrders.forEach(order => {
        if (order.products_items) {
          order.products_items.forEach(item => {
            productIds.push(item.productId);
          });
        }
      });

      const productsData = await Products.find({ product_id: { $in: productIds } }).lean();

      const productMap = {};
      productsData.forEach(p => {
        productMap[p.product_id] = p;
      });

      userOrders = userOrders.map(order => {
        const enrichedItems = order.products_items.map(item => {
          const product = productMap[item.productId];
          return {
            ...item,
            title: product ? product.title : "Unknown Product",
            image: product ? product.image : "",
            category: product ? product.category : ""
          };
        });
        return { ...order, products_items: enrichedItems };
      });
    }

    res.status(200).json(userOrders);

  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};


// ------------------- OTP STORE -------------------
const otpStore = new Map();

// ------------------- SEND OTP -------------------
const sendOtp = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const checkPass = await bcrypt.compare(password, user.password);
    if (!checkPass) return res.status(401).json({ error: "Invalid credentials" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

    otpStore.set(email, { otp, expiresAt });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Login OTP - MY STORE",
      html: `
        <h2>Login Verification</h2>
        <p>Your 6-digit OTP for logging into My Store is:</p>
        <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP is valid for ${expiryMinutes} minutes.</p>
        <hr/>
        <p>If you did not request this, please ignore this email.</p>
      `
    };

    console.log(`Sending OTP email via ${transporter.options.host}:${transporter.options.port}`);
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent to your email" });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// ------------------- VERIFY OTP -------------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP is valid
    otpStore.delete(email);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    await completeLoginResponse(user, res);

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ------------------- ADDRESS CONTROLLERS -------------------
const addAddress = async (req, res) => {
  try {
    const { fullName, phone, address, city, state, pincode } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.addresses.push({ fullName, phone, address, city, state, pincode });
    await user.save();

    res.status(200).json({
      message: 'Address added successfully',
      addresses: user.addresses
    });

  } catch (error) {
    console.error("Add Address Error:", error);
    res.status(500).json({ message: 'Server error adding address' });
  }
};

const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.addresses || []);

  } catch (error) {
    console.error("Get Addresses Error:", error);
    res.status(500).json({ message: 'Server error fetching addresses' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out the address to delete
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);

    await user.save();
    res.status(200).json({ message: 'Address deleted successfully', addresses: user.addresses });

  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: 'Server error deleting address' });
  }
};

// ------------------- UPDATE PROFILE -------------------
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, email, phone } = req.body;

    let updateData = { firstName, lastName, email, phone };

    if (req.file) {
      updateData.profilePic = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profilePic: updatedUser.profilePic,
        addresses: updatedUser.addresses
      }
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// ------------------- RAZORPAY INTEGRATION -------------------

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    console.log("Creating Razorpay order for amount:", amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency,
      receipt: `receipt_${Date.now()}`
    };

    console.log("Razorpay Options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay Order Created:", order.id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay Order Creation Error Detail:", error);
    res.status(500).json({ error: error.message || "Failed to create Razorpay order" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isMatch = expectedSignature === razorpay_signature;

    if (isMatch) {
      res.status(200).json({ message: "Payment verified successfully", success: true });
    } else {
      res.status(400).json({ message: "Invalid signature", success: false });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({ error: "Internal Server Error during verification" });
  }
};

// ------------------- EXPORT -------------------
module.exports = {
  products, newUser, userlogin, addCart,
  getCart, updateCart, removeFromCart, clearCart,
  placeOrder, cancelOrder, sendRegistrationEmail, getOrders,
  sendOtp, verifyOtp,
  addAddress, getAddresses, deleteAddress,
  updateProfile,
  createRazorpayOrder, verifyPayment
};
