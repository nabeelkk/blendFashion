const User = require('../modal/userModal')
const Product = require('../modal/productModal');
const Cart = require('../modal/cartModal');
const  mongoose  = require('mongoose');
const Order = require('../modal/orderModal')
const Offer =require('../modal/offerModal')



const checkOut = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const address = await User.findById({_id:userId})
        
        
        const cart = await Cart.findOne({ userId }).populate({
                    path: 'products.productId',
                    populate: {
                        path: 'category',
                        model: 'Category'
                    }
                })
        const today = new Date();
        const categoryOffer = await Offer.find({type:'category',isActive:true,endDate:{$lt:today}}).populate('category')
        const cloudName = process.env.CLOUDINARY_NAME 
        if (!cart || cart.products.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }
        for (const item of cart.products) {
            const product = item.productId;
            const size = item.size;
            const requestedQty = item.quantity;
    
            if (!product || product.isdeleted || !product.isListed) {
            req.flash('error', `${product?.name || 'Item'} is no longer available`);
            return res.redirect('/cart');
            }
    
            const sizeStock = product.sizes[size]?.quantity;
            if (requestedQty > sizeStock) {
                req.flash(
                    'error',
                    `${product.name} (${size}) is not available. Please remove this item`
                );
            return res.redirect('/cart');
            }
            
        }
        let totalPrice = 0;
        let discount = 0;
        let totalMRP = 0;
        let products = [];
        let appliedOffer = 0
        const discountAmount = req.session.user.discountAmount
        let coupon = req.session.user.discountAmount
        if (cart && cart.products.length > 0) {
            products = cart.products;

            products.forEach(prod => {
                const product = prod.productId;
                const category = product.category;
                const quantity = prod.quantity;
                const price = prod.price;
                const size = prod.size
                const MRP = product.sizes[size].Mrp

                totalMRP += MRP * quantity;
                const today = new Date()
                const productOffer = MRP - price
                let categoryDiscount = 0

                if(category){
                    const matchingCategoryOffer = categoryOffer.find(offer =>
                        offer.category._id.toString() === category._id.toString() &&
                        new Date(offer.startDate) <= today &&
                        new Date(offer.endDate) >= today
                    );
                
                if (matchingCategoryOffer) {
                    categoryDiscount = (product.sizes[size].Mrp * matchingCategoryOffer.discount) / 100;
                }
                }

                appliedOffer = Math.max(productOffer, categoryDiscount);
                let productDiscount = 0;
                if (appliedOffer > 0) {
                    const discountedPrice = MRP - appliedOffer;
                    productDiscount = (MRP - discountedPrice) * quantity;
                }
                discount += productDiscount;
                totalPrice += (MRP * quantity) - productDiscount;
            });
            
        }
        if(coupon){
                totalPrice = totalPrice - coupon
        }
        

        res.render('users/checkOut',{user:req.session.user,address,cart,totalMRP,cloudName,totalPrice:totalPrice.toFixed(2),discount:discount.toFixed(2),appliedOffer,coupon,discountAmount: discountAmount ? discountAmount.toFixed(2) : '0.00'})
    } catch (error) {
        console.log('checkout side',error)
        res.status(500).send("Internal error")
    }
}

const checkOutSuccess = async(req,res)=>{
    try {
        const cart = await Cart.findOne({userId:req.session.user._id})
        res.render('users/checkOutSuccess',{user:req.session.user,cart})
    } catch (error) {
        console.log("Get Checkout side",error)
    }
}
const addCheckoutAddress = async (req,res)=>{
    try {
        const {
            firstName,
            lastName,
            addressName,
            phoneNumber,
            addressLine,
            city,
            state,
            zipCode,
            deliveryInstructions
            } = req.body.data

         let datas = await User.findByIdAndUpdate(req.session.user._id,{
            $push:{
                address:{
                    id:new mongoose.Types.ObjectId(),
                    firstName ,
                    lastName,
                    addressName,
                    phoneNumber,
                    addressLine,
                    city,
                    state,
                    zipCode,
                    deliveryInstructions
                }
            }
        },{new:true})
        return res.json({success:true,message:"Address Successfully Added"})
    } catch (error) {
        console.log('checkout add address side',error);
        return res.status(500).send('Internal server error')
    }
       
}

const editCheckoutAddress = async (req,res)=>{
    try {
        const itemId = req.params.id
        const userId = req.session.user._id;
        const {
            firstName,
            lastName,
            addressName,
            phoneNumber,
            addressLine,
            city,
            state,
            zipCode,
            deliveryInstructions
            } = req.body.editData
        
        await User.updateOne({userId,"address.id":itemId},{
                $set:{
                    "address.$.firstName":firstName,
                    "address.$.lastName":lastName,
                    "address.$.addressName":addressName,
                    "address.$.phoneNumber":phoneNumber,
                    "address.$.addressLine":addressLine,
                    "address.$.city":city,
                    "address.$.state":state,
                    "address.$.zipCode":zipCode,
                    "address.$.deliveryInstructions":deliveryInstructions,
        
                }
            })
            return res.json({success:true,message:"Address successfully edited"})
    } catch (error) {
        console.log('edit checkout address side',error)
        return res.status(500).send('Internal error')
    }
}

const deleteCheckoutAddress = async(req,res)=>{
    try {
        const itemId = req.params.id;
        const userId = req.session.user._id
        await User.findByIdAndUpdate(userId,{
            $pull:{
                address:{id:itemId}
            }
        })
        return res.json({success:true,message:"Address successfully deleted"})
    } catch (error) {
        console.log('delete checkout address side',error)
        return res.status(500).send('Internal error')
    }
    
}

const paymentMethod =async (req,res)=>{
   try {
        const defaultAddressId = req.params.id
        req.session.defaultAddressId = defaultAddressId
        
        const userId = req.session.user._id
        const address = await User.findById({_id:userId})
        if(!address){
            return res.json({success:false,message:"Address is required"})
        }
         const cart = await Cart.findOne({ userId }).populate({
                    path: 'products.productId',
                    populate: {
                        path: 'category',
                        model: 'Category'
                    }
                })
        const today = new Date();
        const categoryOffer = await Offer.find({type:'category',isActive:true,endDate:{$lt:today}}).populate('category')
        const cloudName = process.env.CLOUDINARY_NAME 
        const discountAmount = req.session.user.discountAmount
        let coupon = req.session.user.discountAmount
        if (!cart || !cart.products?.length) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
          }
        for (const item of cart.products) {
            const product = item.productId;
            const size = item.size;
            const requestedQty = item.quantity;
            
    
            if (!product || product.isdeleted || !product.isListed) {
            req.flash('error', `${product?.name || 'Item'} is no longer available`);
            return res.redirect('/cart');
            }
    
            const sizeStock = product.sizes[size]?.quantity || 0;
            if(sizeStock<requestedQty){
                return res.json({success:false,message:"Out of Stock"})
            }
            if (requestedQty > sizeStock) {
            req.flash(
                'error',
                `${product.name} (${size}) is not available. Please remove this item`
            );
            return res.redirect('/cart');
            }
            
        }
        let totalPrice = 0;
        let discount = 0;
        let totalMRP = 0;
        let products = [];
        let appliedOffer = 0
        if (cart && cart.products.length > 0) {
            products = cart.products;

            products.forEach(prod => {
                const product = prod.productId;
                const category = product.category;
                const quantity = prod.quantity;
                const price = prod.price;
                const size = prod.size
                const MRP = product.sizes[size].Mrp

                totalMRP += MRP * quantity;
                const today = new Date()
                const productOffer = product.sizes[size].Mrp - price;
                
                let categoryDiscount = 0

                if(category){
                    const matchingCategoryOffer = categoryOffer.find(offer =>
                        offer.category._id.toString() === category._id.toString() &&
                        new Date(offer.startDate) <= today &&
                        new Date(offer.endDate) >= today
                    );
                
                if (matchingCategoryOffer) {
                    categoryDiscount = (product.sizes[size].Mrp * matchingCategoryOffer.discount) / 100;
                }
                }

                appliedOffer = Math.max(productOffer, categoryDiscount);
                let productDiscount = 0;
                if (appliedOffer > 0) {
                    const discountedPrice = MRP - appliedOffer;
                    productDiscount = (MRP - discountedPrice) * quantity;
                }
                discount += productDiscount;
                totalPrice += (MRP * quantity) - productDiscount;
            });
            
        }
        if(coupon){
                totalPrice = totalPrice - coupon
        }
        res.render('users/paymentMethod',{user:req.session.user,address,cart,coupon,cloudName,totalPrice:totalPrice.toFixed(2),totalMRP,discount:discount.toFixed(2),appliedOffer,defaultAddressId,discountAmount: discountAmount ? discountAmount.toFixed(2) : 0, messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }})
   } catch (error) {
        console.log('Payment method side',error);
        res.status(500).send("Internal error")
   }
}








module.exports = {
                  checkOut,
                  checkOutSuccess,
                  addCheckoutAddress,
                  editCheckoutAddress,
                  deleteCheckoutAddress,
                  paymentMethod,
                 }