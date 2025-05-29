const express = require('express');
const userController = require('../controller/userController');
const wishlistController = require('../controller/wishlistController')
const passport = require('passport')
const nocache = require('../middlewares/nocache');
const isAuthenticated = require('../middlewares/isAuthenticated')
const redirect = require('../middlewares/redirect');
const checkoutController = require('../controller/checkoutController')
const orderController = require('../controller/orderController')
const isOrderOwner = require('../middlewares/orderOwner');
const otpRateLimiter = require('../middlewares/otpRateLimit')
const couponController = require('../controller/couponController')
const router = express.Router();


function preventBackHistory(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
}

router.get('/',preventBackHistory,userController.home)
router.get('/signup',userController.getSignup);
router.post('/signup',otpRateLimiter,userController.signup);
router.get('/otp',nocache,userController.getOtp);
router.post('/otp',userController.verifyOtp)
router.get('/resendotp',userController.resendOtp)

router.get('/login',nocache,userController.getLogin)
router.post('/login',userController.login)
router.get('/logout',isAuthenticated,userController.logout);

router.get('/user/google',redirect,nocache,passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/user/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=This%20user%20is%20blocked',
        failureMessage:true
    }),
    (req, res) => {
        req.session.user = req.user;
        req.session.isAuth = true;
        res.redirect('/');
       }
);

router.get('/forgotpassword',userController.forgetPass)
router.post('/forgotpassword',userController.forgetpassword)
router.get('/reset-pass/:token',userController.getresetPass)
router.post('/reset-pass/:token',userController.resetPass)


router.get('/userdash',isAuthenticated,nocache,userController.userDash) 

router.get('/cart',userController.myCart)
router.post('/cart/add',userController.addCart)
router.post('/cart/update-quantity',userController.updateQuantity)
router.post('/checkQuantity',userController.checkQuantity)
router.delete('/cart/remove/:productId/:size',userController.deleteCartItem)

router.get('/checkout',isAuthenticated,checkoutController.checkOut)
router.get('/checkoutsuccess',isAuthenticated,checkoutController.checkOutSuccess);
router.post('/checkout/address/add',isAuthenticated,checkoutController.addCheckoutAddress)
router.delete('/checkout/delete/:id',isAuthenticated,checkoutController.deleteCheckoutAddress)
router.put('/checkout/edit/:id',isAuthenticated,checkoutController.editCheckoutAddress)
router.get('/checkout/paymentmethod/:id',isAuthenticated,checkoutController.paymentMethod)
router.post('/place-order',isAuthenticated,orderController.placeOrder)
router.post('/create-razorpay-order',isAuthenticated,orderController.createRazorpayOrder)
router.post('/payment-success',isAuthenticated, orderController.handlePaymentSuccess)
router.get('/checkoutfailure',isAuthenticated, orderController.handleCheckoutFailure);


router.get('/address',isAuthenticated,userController.addresses)
router.get('/address/add',isAuthenticated,userController.getaddAddress)
router.post('/address/add',isAuthenticated,userController.addAddress)
router.get('/address/edit/:id',isAuthenticated,userController.getEditAddress)
router.post('/address/edit/:id',isAuthenticated,userController.editAddress)
router.post('/address/delete/:id',isAuthenticated,userController.deleteAddress)


router.get('/brand',userController.brand)
router.get('/error',userController.error)
router.get('/newarrival',userController.newArrival)

router.get('/myOrder',isAuthenticated,orderController.myOrder)
router.get('/orderplaced',isAuthenticated,orderController.orderPlaced)
router.get('/orderdetails/:orderId',isAuthenticated,orderController.orderdetails)
router.post('/myorder/cancel',  isAuthenticated,orderController.cancelOrder)
router.post('/myorder/bulkCancel',isAuthenticated,orderController.bulkCancel)
router.post('/order/return',isAuthenticated,orderController.returnProduct)
router.get('/order/invoice/:id',isAuthenticated,orderController.invoice)

router.get('/products',userController.products)
router.get('/productdetails/:id',userController.productDetails)
router.get('/editprofile',isAuthenticated,userController.editProfile)
router.post('/editprofile',isAuthenticated,userController.updateProfile)
router.get('/changeEmail',isAuthenticated,userController.changeEmail)
router.post('/changeEmail',isAuthenticated,userController.verifyEmailOtp)
router.post('/user/change-password',isAuthenticated,userController.changePassword)

router.get('/wishlist',isAuthenticated,wishlistController.wishList)
router.post('/wishlist/add/:id',isAuthenticated,wishlistController.addwishList)
router.delete('/wishlist/remove/:productId',isAuthenticated,wishlistController.removewishList)

router.get('/myWallet',isAuthenticated,userController.myWallet)
router.post('/applycoupon',isAuthenticated,couponController.applyCoupon)
router.post('/removecoupon',isAuthenticated,couponController.removeCoupon)



module.exports = router;