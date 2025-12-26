const express = require('express');
const router = express.Router();
const userController = require('./controller/userController');
const authMiddleware = require('../middleware/authMiddleware');

// ------------------- AUTHENTICATION ENDPOINTS -------------------
router.post('/register', userController.newUser);
router.post('/login', userController.userlogin);

// ------------------- CART ENDPOINTS (Protected) -------------------
router.post('/cart/add', authMiddleware, userController.addToCart);
router.get('/cart', authMiddleware, userController.getCart);
router.delete('/cart/remove/:productId', authMiddleware, userController.removeItemFromCart);
router.delete('/cart', authMiddleware, userController.clearCart);

// ------------------- ORDER ENDPOINTS (Protected) -------------------
router.post('/orders/place', authMiddleware, userController.placeOrder);
router.get('/orders', authMiddleware, userController.getOrders);

// ------------------- EMAIL ENDPOINTS -------------------
router.post('/send-mail', userController.sendmail);

module.exports = router;
