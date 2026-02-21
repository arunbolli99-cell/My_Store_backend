const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const Products = require('../models/Product_data');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images are allowed (jpeg, jpg, png, webp)"));
    }
});

router.get('/products', userController.products);

router.post('/adduser', userController.newUser);
router.post('/login', userController.userlogin);
router.post('/login/send-otp', userController.sendOtp);
router.post('/login/verify-otp', userController.verifyOtp);

router.post('/add-address', authMiddleware, userController.addAddress);
router.get('/get-addresses', authMiddleware, userController.getAddresses);
router.delete('/delete-address/:addressId', authMiddleware, userController.deleteAddress);

router.post('/addCart', authMiddleware, userController.addCart);
router.get('/getCart', authMiddleware, userController.getCart);
router.put('/updateCart/:productId', authMiddleware, userController.updateCart);
router.delete('/removeCart/:cartItemId', authMiddleware, userController.removeFromCart);
router.delete('/clearCart', authMiddleware, userController.clearCart);

router.post('/placeOrder', authMiddleware, userController.placeOrder);
router.get('/getOrders', authMiddleware, userController.getOrders);
router.delete('/cancelOrder/:orderId', userController.cancelOrder);

router.post('/create-razorpay-order', authMiddleware, userController.createRazorpayOrder);
router.post('/verify-payment', authMiddleware, userController.verifyPayment);

router.put('/update-profile', authMiddleware, upload.single('profilePic'), userController.updateProfile);

module.exports = router;