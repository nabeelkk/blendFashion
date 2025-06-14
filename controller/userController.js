const User = require('../modal/userModal');
const bcrypt = require('bcrypt');
const passport = require('passport');
const crypto = require('crypto');
const transport = require('../config/nodeMailer');
const Product = require('../modal/productModal')
const mongoose = require('mongoose')
const Category = require('../modal/category');
const Cart = require('../modal/cartModal');
const Wishlist = require('../modal/whishListModel');
const validator = require('validator')
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path')
const Order = require('../modal/orderModal')
const Wallet = require('../modal/walletModal')
const Offer = require('../modal/offerModal')
const Coupon = require('../modal/coupenModel')
const ejs = require('ejs')



const getSignup = (req,res)=>{
    const error1 = req.query.error1;
    const error5 = req.query.error5;
    res.render('users/registration',{error1,error5})
}
const generateOtp = ()=>{
    return Math.floor(100000 + Math.random()* 900000).toString()
}

const signup =async (req,res)=>{
    try {
        const {name,email,mobile,password,otherreferalcode} = req.body;

        const username = await User.findOne({name})
        if(username){
            return res.redirect("/signup?error5=User%20Name%20Already%20Exist")
        }
        
        const user = await User.findOne({email})
        if(user){
            return res.redirect("/signup?error1=User%20Already%20Exist")
        }
        

        const hashedPass =await bcrypt.hash(password,10)
        
        const otp = generateOtp();
        const otpExpr = Date.now() + 1 * 60 * 1000;
        
        console.log(otp)

        req.session.otp = otp;
        req.session.email = email;
        req.session.name = name;

        req.session.newUser={
            name,email,mobile,password:hashedPass,otherreferalcode,otp,otpExpr
        }
        const cloudName = process.env.CLOUDINARY_NAME
        const templatePath = path.join(__dirname, '../views/users/otpEmail.ejs');
        const htmlContent = await ejs.renderFile(templatePath, { username:name , otp,cloudName});

        await transport.sendMail({
            from:process.env.MYGMAIL,
            to:email,
            subject:"You Otp for Signup",
            html:htmlContent
        })

        return res.redirect('/otp')

    } catch (error) {
        console.log("Registration Error",error);
        res.status(500).send("Internal Error");
    }
}

const getOtp = (req,res)=>{
    const error = req.query.error
    const message = req.query.message
    const otpTime=  req.session.newUser?.otpExpr
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('users/otp',{user:req.session.newUser,error,message,otpTime})
}

const verifyOtp = async (req, res) => {
    try {
        const otp = req.body.otp;
        const newUser = req.session.newUser;

        if (!newUser) {
            return res.status(403).send("User invalid");
        }

        if (otp !== newUser.otp) {
            return res.redirect('/otp?error=Invalid%20OTP');
        }

        if (Date.now() > newUser.otpExpr) {
            return res.redirect('/otp?error=OTP%20has%20expired');
        }

        const user = new User({
            name: newUser.name,
            email: newUser.email,
            mobile: newUser.mobile,
            password: newUser.password,
            otherreferalcode: newUser.otherreferalcode,
            isVerified: true, 
        });

        await user.save();
        req.session.newUser = null;
        req.session.otpExpr = null;
  
        return res.redirect('/login?SignupSuccess=Account Created.');

    } catch (error) {
        console.error("OTP verification error:", error);

        if (error.code === 11000 && error.keyPattern?.email) {
            return res.redirect('/otp?error=Email%20already%20registered');
        }

        return res.status(500).redirect('/otp?error=Server%20error');
    }
};
const resendOtp = async(req,res)=>{

    try {
        const newUser = req.session.newUser
        if(!newUser){
            return res.redirect('/signup');
        }

        const newOtp = generateOtp();
        const newOtpExpr = Date.now() + 1 * 60 * 1000
        console.log(newOtp);

        req.session.newUser.otp = newOtp;
        req.session.newUser.otpExpr = newOtpExpr

        const cloudName = process.env.CLOUDINARY_NAME
        const templatePath = path.join(__dirname, '../views/users/otpEmail.ejs');
        const htmlContent = await ejs.renderFile(templatePath, { username:req.session.name , otp,cloudName});

        await transport.sendMail({
            from:process.env.MYGMAIL,
            to:email,
            subject:"Resended OTP",
            html:htmlContent
        })
        return res.redirect('/otp?message=OTP%20resent%20successfully')
    } catch (error) {
        console.log('Resend otp side',error)
    }

}
const getLogin = (req,res)=>{
    const error = req.query.error;
    const signupSuccess = req.query.SignupSuccess
    const resetPass = req.query.resetPass
    if(req.session.user){
       return res.redirect('/')
    }
    res.render('users/login',{error,signupSuccess,resetPass})
}

const login =async (req,res)=>{
    try {
        const {email,password} = req.body;
        const user = await User.findOne({email})
        
        if(!user){
            return res.redirect('/login/?error=User%20not%20found')
        }
        

        const isMatch =await bcrypt.compare(password,user.password);
        

        if(!isMatch){
            return res.redirect('/login/?error=Invalid%20password%20or%20username');
        }
        if(user.isBlocked == true){
            
            return res.redirect('/login/?error=This%20User%20is%20blocked')
        }
        req.session.user = user;
        req.session.isAuth = true;
        return res.redirect('/')
    } catch (error) {
        console.log("login error",error);
        res.status(500).send("Internal Error");
    }
}
const home =async (req,res)=>{
    try{
        const products = await Product.find({isdeleted:false})
        const user = req.session.user

        const trendingProd = await Product.find({isdeleted:false}).sort({updatedAt:-1})
        const newArrival = await Product.find({isdeleted:false}).sort({createdAt:-1})
        
        if(!user){
            const cloudName = process.env.CLOUDINARY_NAME
            return res.render('index',{user:req.session.user,products,cloudName,newArrival,trendingProd})
        }
        const cart = await Cart.findOne({userId:user._id})
        
        const cloudName = process.env.CLOUDINARY_NAME
        return res.render('index',{user:req.session.user,products,cloudName,cart,newArrival,trendingProd})
    }catch(error){
        console.log('home side ',error)
    }

    
}

const forgetPass = async(req,res)=>{
    const error = req.query.error
    const cloudName = process.env.CLOUDINARY_NAME
    return res.render('users/forgetpass',{error,cloudName})
    
}

const forgetpassword = async (req,res)=>{
    try {
        const {email} = req.body
        if(!email){
            return res.redirect('/forgotpassword?error=Email%20is%20reqiured')
        }
        const user = await User.findOne({email})
       
        if(!user){
            return res.redirect('/forgotpassword?error=User%20not%20found')
        }
        if( email.toLowerCase() !== user.email.toLowerCase()){
            return res.redirect('/forgotpassword?error=Email%20not%20exist')
        }
        
        const token = crypto.randomBytes(32).toString("hex")
        
        user.resetToken = token;
        user.resetTokenExpr = new Date()+3600000
        await user.save()
        const cloudName = process.env.CLOUDINARY_NAME
        const resetLink = `https://blendfashion.nabeelkk.store/reset-pass/${token}`
        const templatePath = path.join(__dirname, '../views/users/forgetEmail.ejs');
        const htmlContent = await ejs.renderFile(templatePath, { user, resetLink ,cloudName});

        await transport.sendMail({
            to:user.email,
            subject:"Password Reset",
            html:htmlContent
        });

        res.send("check your email for reset link");
    } catch (error) {
        console.log(error);
        res.status(500).send("Something went wrong");
    }
    

}
const getresetPass = async(req,res)=>{
    const token = req.params.token
    const user = await User.findOne({
        resetToken:token,
        resetTokenExpr:{$gt:Date.now()}
    })

    if(!user){
        return res.send("Inavlid or Expire Tooken")
    }
    
    res.render('users/changepass',{token})
}

const resetPass =async (req,res)=>{
    const {token} = req.params;
    const {newpassword,confirmnewpassword} = req.body;

    try {
        const user = await User.findOne({
            resetToken:token,
            resetTokenExpr:{$gt:Date.now()}
        })

        if(!user){
            return res.send("Invalid or Expire Token");
        }
        if(newpassword !== confirmnewpassword){
            return res.send("Password Not Match!");
        }

        const hashedpass =await bcrypt.hash(newpassword,10)
        user.password = hashedpass;

        user.resetToken = undefined;
        user.resetTokenExpr = undefined;

        await user.save();

        return res.redirect('/login?resetPass=Password Successfully Changed ')

    } catch (error) {
        console.log(error);
        res.status(500).send("internal error");
    }
}
const products = async (req, res) => {
    try {
      if(req.session.user){
        const cart = await Cart.findOne({userId:req.session.user._id}) 
        const categoryList = await Category.find({ isListed: true });
      const {
        search = '',
        sort = '',
        category: categoryFilter = [],
        minPrice = 0,
        maxPrice = Number.MAX_SAFE_INTEGER,
        page = 1
      } = req.query;
  
      const filter = { 
        isdeleted: false,
        isListed: true 
      };
  
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }
  
      const categories = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
  
      filter['sizes.small.amount'] = { 
        $gte: Number(minPrice),
        $lte: Math.min(Number(maxPrice), Number.MAX_SAFE_INTEGER)
      };
  
      const sortOptions = {
        lowToHigh: { 'sizes.small.amount': 1 },
        highToLow: { 'sizes.small.amount': -1 },
        az: { name: 1 },
        za: { name: -1 },
        newest: { createdAt: -1 }
      };
      const sortQuery = sortOptions[sort] || {};
  
      const limit = 6;
      const skip = (page - 1) * limit;
  
      const [totalProduct, productList] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .populate('category')
      ]);
      const totalPage = Math.ceil(totalProduct / limit);
      const cloudName = process.env.CLOUDINARY_NAME;
  
      if (!req.session.user) return res.redirect('/login');
  
      res.render('users/product', {
        category: categoryList,
        search,
        totalPage,
        page: Number(page),
        products: productList,
        sort,
        categoryFilter: categories,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        cloudName,
        cart
      });
      }
      const categoryList = await Category.find({ isListed: true });
      const {
        search = '',
        sort = '',
        category: categoryFilter = [],
        minPrice = 0,
        maxPrice = Number.MAX_SAFE_INTEGER,
        page = 1
      } = req.query;
  
      const filter = { 
        isdeleted: false,
        isListed: true 
      };
  
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }
  
      const categories = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
  
      filter['price.seller'] = { 
        $gte: Number(minPrice),
        $lte: Math.min(Number(maxPrice), Number.MAX_SAFE_INTEGER)
      };
  
      const sortOptions = {
        lowToHigh: { 'price.seller': 1 },
        highToLow: { 'price.seller': -1 },
        az: { name: 1 },
        za: { name: -1 },
        newest: { createdAt: -1 }
      };
      const sortQuery = sortOptions[sort] || {};
  
      const limit = 10;
      const skip = (page - 1) * limit;
  
      const [totalProduct, productList] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .populate('category')
      ]);
  
      const totalPage = Math.ceil(totalProduct / limit);
      const cloudName = process.env.CLOUDINARY_NAME;
  
      if (!req.session.user) return res.redirect('/login');
  
      res.render('users/product', {
        category: categoryList,
        search,
        totalPage,
        page: Number(page),
        products: productList,
        sort,
        categoryFilter: categories,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        cloudName,
      });
  
    } catch (error) {
      console.error("Product listing error:", error);
      res.status(500).send('Internal server error'); 
    }
  };
const userDash =async (req,res)=>{
    try {
        const user=req.session.user
        const order = await Order.find({user:user._id}).populate('products.productId')  
        const wishlist = await Wishlist.find({userId:user._id})
        const wallet = await Wallet.find({user:user._id})
        const cart = await Cart.findOne({userId:req.session.user._id})
        let balance
        wallet.forEach((element)=>{
           balance = element.balance
        })
        let status
        order.forEach((element)=>{
            element.products.forEach((prod)=>{
                status = prod.status
            })
        })
        return res.render('users/userDash',{user,order,wishlist,balance,status,cart})
    } catch (error) {
        console.log("user dashboard side",error)
        return res.status(500).send('Internal Error')
    }
}
const editProfile = async(req,res)=>{
    try {
        const cart = await Cart.find({userId:req.session.user._id})
        let cartCount 
        cart.forEach((elem)=>cartCount = elem.products.length) 
        const error = req.query.error
        return res.render('users/editProfile',{user:req.session.user,error,cartCount})
    } catch (error) {
        console.log('Get Edit Profile',error)
    }
}

const updateProfile = async (req, res) => {
    try {
      const { name, email, phone } = req.body;

      const userId = req.session.user._id;
      
      if (!name?.trim() || !phone?.trim()) {
        return res.redirect('/editprofile?error=Name%20and%20Phone%20are%20required');
      }
      const user = await User.findById(userId);
      if (!user) return res.redirect('/login');
      
  
      if (email !== user.email) {
        if (!validator.isEmail(email)) {
          return res.redirect('/editprofile?error=Invalid%20email%20format');
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.redirect('/editprofile?error=Email%20already%20registered');
        }
  
        const otp = generateOtp();
        console.log(otp)
        req.session.tempProfileUpdate = {
          _id: userId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          otp
        };
  
        await transport.sendMail({
          from: process.env.MYGMAIL,
          to: email,
          subject: "OTP for Email Change",
          text: `Your OTP is ${otp} (valid for 5 minutes)`
        });
  
        return res.redirect('/changeEmail');
      }
  
      await User.findByIdAndUpdate(userId, {
        name: name.trim(),
        phone: phone.trim()
      });
  
      req.session.user.name = name.trim();
      req.session.user.phone = phone.trim();
  
      res.redirect('/userDash');
  
    } catch (error) {
      console.error('Profile update error:', error);
      res.redirect('/editprofile?error=Server%20error');
    }
  };

const changeEmail = async(req,res)=>{
    const error = req.session.error;
    const message = req.session.message;
    res.render('users/changepassotp',{user:req.session.profileUpdate,error,message})
}
const verifyEmailOtp = async (req, res) => {
    try {
      const { otp } = req.body;
      const tempUser = req.session.tempProfileUpdate;
  
      if (!tempUser || otp !== tempUser.otp) {
        return res.redirect('/changeEmail?error=Invalid%20OTP');
      }
      const updatedUser = await User.findByIdAndUpdate(
        tempUser._id,
        {
          name: tempUser.name,
          email: tempUser.email,
          phone: tempUser.phone
        },
        { new: true }
      );
  
      req.session.user = {
        ...req.session.user,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone
      };
  
      req.session.tempProfileUpdate = null;
  
      res.redirect('/userDash');
  
    } catch (error) {
      console.error('OTP verification error:', error);
      res.redirect('/changeEmail?error=Verification%20failed');
    }
  };

  const changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.session.user._id);
  
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.json({ 
          success: false, 
          message: "Current password is incorrect" 
        });
      }
  
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ 
            success: false, 
            message: "Password changed but logout failed" 
          });
        }
        res.clearCookie('connect.sid');
        return res.json({ 
          success: true, 
          message: "Password updated successfully. Please login again." 
        });
      });
  
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  };


const myCart = async (req, res) => {
    try {
        if(!req.session.user){
            return res.redirect('/login')
        }
        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId }).populate({
            path: 'products.productId',
            populate: {
                path: 'category',
                model: 'Category'
            }
        });
        const newArrival = await Product.find({isdeleted:false}).sort({createdAt:-1})
        if(cart?.products.length === 0){
            req.session.user.discountAmount = null;
            res.render('users/cart', {cart, user: req.session.user,newArrival, cloudName: process.env.CLOUDINARY_NAME, totalMRP: 0, cartTotal: 0, discount: 0, cartCount: 0, appliedOffer: 0, coupon: null, coupons: [], discountAmount: '0.00' });
        }
        
        const cloudName = process.env.CLOUDINARY_NAME;
        const coupon = req.session.user.discountAmount
        const coupons = await Coupon.find({isActive:true})

        const categoryOffer = await Offer.find({type:'category',isActive:true}).populate('category')
        const discountAmount = req.session.user.discountAmount
        let cartTotal = 0;
        let discount = 0;
        let totalMRP = 0;
        let cartCount = cart?.products.length || 0;
        let products = [];
        let appliedOffer = 0

        if (cart && cart.products.length > 0) {
            products = cart.products;
            products.forEach(prod => {
                const product = prod.productId;
                const category = product.category;
                const price = prod.price;
                const quantity = prod.quantity;
                const size = prod.size
                
                const MRP = product.sizes[size].Mrp

                totalMRP += MRP * quantity;
                const today = new Date()
                const productOffer = MRP - price
                let categoryDiscount =0

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
                
                cartTotal += ((MRP * quantity) - (productDiscount)) ;
            });
        }
        if(coupon){
                cartTotal = cartTotal - coupon;
        }

        res.render('users/cart', {  
            user: req.session.user,
            cart: cart || { products: [] },
            cloudName,
            totalMRP,
            cartTotal:cartTotal.toFixed(2),
            discount:discount.toFixed(2),
            cartCount,
            appliedOffer,
            coupon,
            coupons,    
            newArrival,
            discountAmount: discountAmount ? discountAmount.toFixed(2) : '0.00'
        });

    } catch (error) {
        console.log('My cart side', error);
        return res.status(500).send("Internal Error");
    }
};



const addCart = async(req,res)=>{
    try {
        if (!req.session.user) return res.status(401).json({success:false, message: 'Unauthorized' })
        const userId = req.session.user._id;
        const {id,size,price} = req.body
        if(!size){
            return res.json({sizemessage:"Please select a size"})
        }
        const product = await Product.findById(id)
        if (!product || !product.isListed) {
            return res.status(400).json({success:false, message: 'Product unavailable' });
        }
        const sizeData = product.sizes[size];
        if (!sizeData || sizeData.quantity <= 0) {
        return res.status(400).json({success:false, message: 'Selected size unavailable' });
        }

        let cart = await Cart.findOne({userId})
        if(!cart){
            cart = new Cart({userId,products:[]})
        }

        const existingItem = cart.products.find(item => 
            item.productId.equals(id) && item.size === size
        );
      
        if (existingItem) {
            if (existingItem.quantity >= 5) {
              return res.json({ success: false, message: "Maximum quantity reached" });
            }
            if (existingItem.quantity >= sizeData.quantity) {
              return res.json({ success: false, message: "Insufficient stock",quantity:existingItem });
            }
            existingItem.quantity += 1;
        } else {
            cart.products.push({
              productId: id,
              size: size,
              price: price,
              regularPrice: product.sizes[size].Mrp   
            });
        }
      
        await cart.save();

        await Wishlist.updateOne(
            { userId },
            { $pull: {  products:{productId:id}} }
          );
        
        return res.status(200).json({success: true,message:'Item added to cart'});
    } catch (error) {
        console.log('add cart side',error);
        res.status(500).send('Internal error')
    }
}



const updateQuantity = async(req,res)=>{
    try {
        const {productId,size,quantity} = req.body;
        const userId = req.session.user._id;

        const cart = await Cart.findOne({userId})
        if(!cart){
            res.status(404).json({success:false,message:"cart not found"})
        }

        const product = cart.products.find(prod=>prod.productId.equals(productId) && prod.size === size)

        if(!product){
            res.status(404).json({success:false,message:"Product not found in cart"})
        }

        const productData = await Product.findById(productId) 

        if(!productData)return res.status(404).json({success:false,message:"Product not found"})
        let stock
        if(size === 'small') stock = productData.sizes.small.quantity
        else if(size==='medium') stock = productData.sizes.medium.quantity
        else if(size === 'large') stock = productData.sizes.large.quantity
          
        if(quantity > stock){
            return res.status(400).json({success:false,message:`Only ${quantity} item is available for this size`})
        }

        if(quantity > stock || quantity > 5){
            return res.status(400).json({success:false,message:'Cart limit exceed for this size',quantity:quantity})
        }
        product.quantity = quantity;
        await cart.save();
    
        let cartTotal = 0;
        const coupon = req.session.user.discountedTotal

        cart.products.forEach(p => {
            if(coupon){
                cartTotal += p.quantity * p.coupon;
            }else{
                cartTotal += p.quantity * p.price;
            }
          
        });
        
        
    
        res.json({ success: true, cartTotal });
    
    } catch (error) {
        console.log("updating quantity side",error)
    }
}

const checkQuantity = async(req,res)=>{
    const {size,id } = req.body;
    const product = await Product.findOne({_id:id})
    let quantity = product.sizes[size]
    return res.status(200).json({quantity})
    
}

const deleteCartItem = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const {productId,size} = req.params;

        const cart = await Cart.findOne({userId});

        if(!cart){
            return res.status(404).json({success:false,message:"Cart not found"})
        }
        cart.products = cart.products.filter((prod)=>{return !(prod.productId.equals(productId) && prod.size === size)})
        await cart.save()

        const cartTotal = cart.products.reduce((acc,item)=>acc+item.quantity + item.price,0);
        res.json({success:true,cartTotal})

    } catch (error) {
        console.log("delete cart side",error);
        res.status(500).send("internal server error")
    }
}




const addresses = async(req,res)=>{
    const user = await User.findById(req.session.user._id)
    const cart = await Cart.findOne({userId:req.session.user._id})
    res.render('users/myAddresses',{user,address:user.address,cart})
}

const getaddAddress = async(req,res)=>{
      const cart = await Cart.findOne({userId:req.session.user._id})
      const user = await User.findById(req.session.user._id)

    res.render('users/addAddress',{user,cart})
}
const addAddress = async(req,res)=>{
   try {
    const {firstName,
        lastName,
        addressName,
        phoneNumber,
        addressLine,
        city,
        state,
        zipCode,
        deliveryInstructions} = req.body

    await User.findByIdAndUpdate(req.session.user._id,{
        $push:{
            address:{
                id:new mongoose.Types.ObjectId(),
                firstName,
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
    },{new:true});
   
    
    return res.redirect('/address')
   } catch (error) {
        console.log('Add Address side',error);
        return res.send("Internal error")
   }
}
const getEditAddress = async(req,res)=>{
    const id = req.params.id;
    const user = await User.findById(req.session.user._id);
    const address = user.address.find((add)=>add.id == id);
    const cart = await Cart.findOne({userId:req.session.user._id})  
    res.render('users/editAddress',{id,user,address,cart})
}
const editAddress = async(req,res)=>{
    try {
        const id = req.params.id;
        const {firstName,
        lastName,
        addressName,
        phoneNumber,
        addressLine,
        city,
        state,
        zipCode,
        deliveryInstructions} = req.body
    
    await User.updateOne({_id:req.session.user._id,"address.id":id},{
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
    return res.redirect('/address')
    } catch (error) {
        console.log("edit side:",error)
        return res.status(500).send("Internal Error")
    }
    
}
const deleteAddress = async(req,res)=>{
    try {
        const {id} = req.params
        if(!req.session.user){
            return res.redirect('/login')
        }
        const data = await User.findOneAndUpdate({_id:req.session.user._id},{
            $pull:{
                address:{id:id}
            }
        },{new:true})
        return res.redirect('/address')
    } catch (error) {
        console.log('delete address side',error)
        return res.status(500).send("Internal error")
    }
}
const brand = async(req,res)=>{
    try {
        if(req.session.user){
            const cart = await Cart.findOne({userId:req.session.user._id})
            return res.render('users/brand',{user:req.session.user,cart})
        }
        return res.render('users/brand',{user:req.session.user})
    } catch (error) {
        console.log('Barnd Side',error)
        return res.status(500).send("Internal Error")
    }
}

const error = async(req,res)=>{
    res.render('users/error')
}

const newArrival = async(req,res)=>{
    try {
        if(req.session.user){
            const cart = await Cart.findOne({userId:req.session.user._id})
            return res.render('users/newArrival',{cart,user:req.session.user})
        }
        return res.render('users/newArrival',{user:req.session.user})
    } catch (error) {
        console.log('Barnd Side',error)
        return res.status(500).send("Internal Error")
    }
}


const productDetails = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.redirect('/login')
        }
        const productId = req.params.id; 
  
        const categoryOffer = await Offer.find({type:'category',isActive:true}).populate('category')
        const cloudName = process.env.CLOUDINARY_NAME
        const products = await Product.find({isdeleted:false}).populate('category')
        const product = await Product.findById(productId).populate('category');
        const cart = await Cart.findOne({userId:req.session.user._id})
        const recentlyViewed = await Product.find({isdeleted:false}).sort({updatedAt:1})
        const offer = categoryOffer.find((off)=>off.category._id.toString()===product.category._id.toString()) || 0
        if (!product) {
            return res.render('users/error'); 
        }
        res.render('users/productDetails', { product ,products,cloudName,user:req.session.user,cart,recentlyViewed,offer});
    } catch (error) {
        console.log('Product Details Error:', error);
        res.redirect('/error');
    }

}



const myWallet = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const page = parseInt(req.query.page)||1;
        const limit = 5;
        const totalWallet = await Wallet.countDocuments({user:userId})
        const totalPage = Math.ceil(totalWallet/limit)
        const skip = (page-1)*limit;         
        const wallet = await Wallet.find({user:userId})
        .sort({createdAt:-1})
        .limit(limit)
        .skip(skip)

        const cart = await Cart.find({userId:userId})
        let cartCount
        cart.forEach((elem)=>cartCount = elem.products.length)
        let balance
        if(wallet.length > 0) {
            balance = wallet[0].balance; 
        }
        res.render('users/wallet',{user:req.session.user,wallet,balance,cartCount,page,totalPage})
    } catch (error) {
        console.log('Wallet side',error)
        return res.status(500).send("Internal Error")
    }
}
const logout = (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Logout error",err);
                return res.end(500).send("internal error"); 
            }
            res.clearCookie('connect.sid')
            return res.redirect('/')
        })
    } catch (error) {
        console.log("logout Side",error)
    }
}

module.exports = {home,
                  getLogin,
                  getSignup,
                  verifyOtp,
                  getOtp,
                  login,
                  signup,
                  logout,
                  forgetPass,
                  forgetpassword,
                  resetPass,
                  getresetPass,
                  userDash,
                  myCart,
                  getaddAddress,
                  addAddress,
                  brand,
                  error,
                  newArrival,
                  productDetails,
                  products,
                  addresses,
                  myWallet,
                  editProfile,  
                  updateProfile,
                  changeEmail,
                  verifyEmailOtp,
                  resendOtp,
                  editAddress,
                  getEditAddress,
                  deleteAddress,
                  addCart,
                  updateQuantity,
                  checkQuantity,
                  deleteCartItem,
                  changePassword
  
                }
