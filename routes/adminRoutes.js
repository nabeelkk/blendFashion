const express = require('express');
const adminController = require('../controller/adminController');
const {authMiddleware,adminAuth} = require('../middlewares/authMiddleware');
const offerController = require('../controller/offerController');
const couponController = require('../controller/couponController');
const referralController = require('../controller/referralController');


const router = express.Router();


router.get('/login',adminController.getLogin);
router.post('/login',adminController.adminLogin);
router.get('/logout',adminController.adminLogout);
router.get('/users',authMiddleware,adminAuth,adminController.getUser);


router.put('/block/:id',authMiddleware,adminAuth,adminController.blockUser);
router.get('/dashboard',authMiddleware,adminAuth,adminController.getDashboard)


router.get('/productList',authMiddleware,adminAuth,adminController.getProducts)
router.get('/productDetails/:prodId',authMiddleware,adminAuth,adminController.productDetails)
router.get('/addProducts',authMiddleware,adminAuth,adminController.getAddProduct)
router.post('/addProduct',authMiddleware,adminAuth,adminController.addProducts)
router.get('/editProduct/:id',authMiddleware,adminAuth,adminController.loadProduct)
router.post('/editProduct/:id',authMiddleware,adminAuth,adminController.editProduct)
router.get('/deleteProduct/',authMiddleware,adminAuth,adminController.getdeleteProduct)
router.post('/unblock/:id',authMiddleware,adminAuth,adminController.UnblockProduct)
router.post('/block/:id',authMiddleware,adminAuth,adminController.blockProduct)


router.get('/productoffer',authMiddleware,adminAuth,offerController.productOffer)
router.get('/getaddproduct',authMiddleware,adminAuth,offerController.getAddProduct)
router.post('/getaddproduct',authMiddleware,adminAuth,offerController.postProductOffer);
router.post('/deleteproductoffer/:id',adminAuth,offerController.deleteProductOffer)
router.get('/editproductoffer/:id',authMiddleware,adminAuth,offerController.loadEditProductOffer)
router.post('/editproductoffer/:id',authMiddleware,adminAuth,offerController.updateProductOffer)


router.get('/categories',authMiddleware,adminAuth,adminController.getCategory)
router.post('/categories',authMiddleware,adminAuth,adminController.category)
router.get('/editCategory/:id',authMiddleware,adminAuth,adminController.getEditCategory)
router.post('/editCategory/:id',authMiddleware,adminAuth,adminController.editCategory)
router.get('/deleteCategory/:id',authMiddleware,adminAuth,adminController.deleteCategory)


router.get('/categoryoffer',authMiddleware,adminAuth,offerController.categoryOffer)
router.get('/getaddcategory',authMiddleware,adminAuth,offerController.getAddCategory)
router.post('/getaddcategory',authMiddleware,adminAuth,offerController.postCategoryOffer);
router.post('/deletecategoryoffer/:id',adminAuth,offerController.deleteCetegoryOffer)
router.get('/editcategoryoffer/:id',authMiddleware,adminAuth,offerController.loadEditCategoryOffer)
router.post('/editcategoryoffer/:id',authMiddleware,adminAuth,offerController.updateCategoryOffer)


router.get('/orderlist',authMiddleware,adminAuth,adminController.listOrder)
router.get('/orderdetails/:id',authMiddleware,adminAuth,adminController.orderDetails)
router.post('/orders/update-status',authMiddleware,adminAuth,adminController.updateOrderStatus)
router.post('/order/verifyreturn',authMiddleware,adminAuth,adminController.verifyReturn)


router.get('/couponList',authMiddleware,adminAuth,couponController.displayCoupon)
router.get('/addCoupon',authMiddleware,adminAuth,couponController.displayAddCoupon)
router.post('/addCoupon',authMiddleware,adminAuth,couponController.addCoupon)
router.get('/editCoupon',authMiddleware,adminAuth,couponController.getEditCoupon)
router.post('/editCoupon',authMiddleware,adminAuth,couponController.postEditCoupon)
router.get('/blockCoupon',authMiddleware,adminAuth,couponController.blockCoupon)


router.post('/referrals', referralController.handleReferralSignup);
router.get('/referrals/link', referralController.getReferralLink);


router.get('/salesReport',authMiddleware,adminAuth,adminController.getSalesReport)
router.get('/salesDate',authMiddleware,adminAuth,adminController.customDate)
router.get('/data',authMiddleware,adminAuth,adminController.filterDate)


router.get('/brand',authMiddleware,adminController.brands)


module.exports = router;