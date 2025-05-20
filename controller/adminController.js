const bcrypt = require('bcrypt');
const Admin = require('../modal/adminModal');
const User = require('../modal/userModal');
const jwt = require('jsonwebtoken');
const Product = require('../modal/productModal');
const sharp = require('sharp');
const Category = require('../modal/category');
const cloudinary = require('../config/cloudinary');
const Order = require('../modal/orderModal')
const Wallet = require('../modal/walletModal')
const moment = require('moment');
const Cart = require('../modal/cartModal')




const getLogin = async(req,res)=>{
    const error = req.query.error
    if(req.session.admin){
        return res.redirect('/admin/dashboard') 
    }
    res.render('admin/adminLogin',{error});
}

const adminLogin = async(req,res)=>{
    try {
        const {email,password} = req.body;
        const admin = await Admin.findOne({email});

        if(!admin) return res.redirect('/admin/login?error=Admin%20not%20found');
       
        const isMatch = await bcrypt.compare(password,admin.password)
        if(!isMatch) return res.redirect('/admin/login?error=Invalid%20Credential');
        

        req.session.admin = {id:admin._id, email:admin.email}

        if(process.env.AUTH_METHOD === "JWT"){
            const token = jwt.sign({id:admin._id, email:admin.email},process.env.JWT_SECRET,{expiresIn:'1h'})
            res.cookie("token",token,{httpOnly:true});
        }
        return res.redirect('/admin/dashboard');
    } catch (error) {
        console.log("Login error",error);
        res.status(500).send("Internal Server Error");
    }
}

const adminLogout=(req,res)=>{
    res.clearCookie("token");
    req.session.destroy((err)=>{
        if(err){
            console.log("Error destroying session:", err);
            return res.status(500).send("error logout")
        }
        res.redirect('/admin/login');
    })
}

const getDashboard = async  (req,res)=>{
    res.render('admin/dashboard',{admin:req.admin})
}

const getUser = async (req,res)=>{
    try {
        const searchQuery = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 10;

        const filter={
            $or:[
                {name:{$regex:searchQuery,$options:'i'}},
                {email:{$regex:searchQuery,$options:'i'}}
            ]
        }

            const totalUser = await User.countDocuments(filter)
            const totalPage = Math.ceil(totalUser / limit)
        const users = await User.find(filter)
        .sort({createdAt:-1})
        .skip((page - 1) * limit)
        .limit(limit)
        res.render('admin/userslist',{users,totalUser,page,searchQuery,totalPage})
        
    } catch (error) {
        console.log("Error fetching users",error);
        res.status(500).send("Internal error");
    }
   
}

const blockUser = async (req,res)=>{
    try{
        const user = await User.findById(req.params.id)

        if(!user){
            return res.status(404).json({message:'Invalid User'})
        }

        user.isBlocked = !user.isBlocked;
        await user.save({validateBeforeSave:false})

        res.status(200).json({message:`user blocked`})
    }catch(error){
        console.log('Block user error',error);
        res.status(500).send('Internal error')
    }
}

const getProducts =async (req,res)=>{
    try {
        const search = req.query.search || '';
        const page = req.query.page || 1;
        const limit = 10;
        const cloudName = process.env.CLOUDINARY_NAME;
        const query={
            isdeleted:false,
            name:{$regex : new RegExp(search,'i')}
        }
        

        const total = await Product.countDocuments(query);
        const totalPage = Math.ceil(total/limit);
        

        const product = await Product.find(query)
        .sort({createdAt:-1})
        .skip((page - 1)*limit)
        .limit(limit)
        .populate("category");
        
       

        res.render('admin/productList',{totalPage,search,page,product,cloudName})


    } catch (error) {
        console.log(error)
    }
   
}
const productDetails = async(req,res)=>{
    try {
        const prodId=req.params.prodId
        const product = await Product.findById({_id:prodId}).populate('category')
        
        const cloudName = process.env.CLOUDINARY_NAME

        res.render('admin/productDetails',{product,cloudName})
    } catch (error) {
        console.log('productDetails admin side',error)
        return res.status(500).send('Internal error')
    }
}

const getAddProduct =async (req,res)=>{
    try {
        const category = await Category.find({isListed:true});
        const sizeError  = req.query.errorsize;
        const imageError = req.query.errorimage
        let brand = []
        res.render('admin/addProduct',{category,sizeError,imageError,brand})
    } catch (error) {
        console.log(error)
        res.status(500).send("Internal error")
    }
}
const addProducts= async(req,res)=>{
    try {
        let {name,description,category,brand,regularPrice,salesPrice,small,medium,large,largeQuantity,mediumQuantity,smallQuantity} = req.body;

        if (!small || !medium || !large){
        return res.redirect('/admin/addProducts/?errorsize=All%20sizes%20are%20required');
        }
        const files = req.files?.images
        
        if(!files){
            return res.status(400).send("No files were uploaded.");
        }

        
        const fileArray = Array.isArray(files)?files:[files];

        if(files.length == 1||files.length<3){
            return res.redirect('/admin/addProducts?errorimage=At%20least%203%20images%20are%20required')
        }
        const images = [];
        for(let file of fileArray){
        const result = await cloudinary.uploader.upload(file.tempFilePath,{
            folder:'blend_products',
            width:600,
            height:600,
            crop: 'fill',
            gravity: 'auto',
            format: 'jpeg',
            quality: 'auto'
        })

            images.push(result.public_id);
        }

        const newProduct = new Product({
            name,
            description,
            category,
            brand,
            price: {
            regular:regularPrice,
            seller:salesPrice
            },
            sizes: {
            small:{
                amount:small,
                quantity:smallQuantity
            },
            medium:{
                amount:medium,
                quantity:mediumQuantity
            },
            large:{
                amount:large,
                quantity:largeQuantity
            }
            },
            images
        });
       

        await newProduct.save();
        res.redirect('/admin/productList')
    } catch (error) {
        console.log("Add product error",error)
    }
    
}

const loadProduct = async(req,res)=>{
   try {
    const product = await Product.findOne({_id:req.params.id,isdeleted:false})
    const category = await Category.find({isListed:true})
    const cloudName = process.env.CLOUDINARY_NAME;

    res.render('admin/editProduct',{product,category,cloudName})
   } catch (error) {
    console.error(error);
    res.redirect('/admin/productList');
   }
}

const editProduct = async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        brand,
        regularPrice,
        salesPrice,
        small,
        medium,
        large,
        largeQuantity,
        mediumQuantity,
        smallQuantity,
        removeImages = [],
      } = req.body;

      const product = await Product.findById(req.params.id);
  
      if (!product) {
        return res.status(404).send("Product not found");
      }
  
      let images = [...(product.images || [])];
  
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : (typeof removeImages === 'string' ? removeImages.split(',').filter(Boolean) : []);
      if (imagesToRemove.length > 0) {
        images = images.filter((publicId) => !imagesToRemove.includes(publicId));
        for (const publicId of imagesToRemove) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error(`Failed to delete Cloudinary image ${publicId}:`, err);
          }
        }
      }
  
      if (req.files && req.files['replaceImage[0]']) {
        const replaceImage = req.files['replaceImage[0]'];
        try {
          const result = await cloudinary.uploader.upload(replaceImage.tempFilePath, {
            folder: 'blend_products',
            width: 600,
            height: 600,
            crop: 'fill',
            gravity: 'auto',
            format: 'jpeg',
            quality: 'auto',
          });
          if (0 < images.length) {
            images[0] = result.public_id;
          } else {
            images.push(result.public_id);
          }
        } catch (err) {
          console.error('Failed to upload replacement image at index 0:', err);
        }
      }
  
      if (req.files && req.files.image) {
        const uploadedFiles = Array.isArray(req.files.image) ? req.files.image : [req.files.image];
        for (const file of uploadedFiles) {
          try {
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'blend_products',
              width: 600,
              height: 600,
              crop: 'fill',
              gravity: 'auto',
              format: 'jpeg',
              quality: 'auto',
            });

            images.push(result.public_id);
          } catch (err) {
            console.error('Failed to upload additional image:', err);
          }
        }
      }
  
      product.name = name;
      product.description = description;
      product.category = category;
      product.brand = brand;
      product.price = {
        regular: regularPrice || product.price.regular, 
        seller: salesPrice || null,
      };
      product.sizes = {
        small: {
          amount: small || 0,
          quantity: smallQuantity || 0,
        },
        medium: {
          amount: medium || 0,
          quantity: mediumQuantity || 0,
        },
        large: {
          amount: large || 0,
          quantity: largeQuantity || 0,
        },
      };
      product.images = images;
  
      await product.save();
      res.redirect('/admin/productList');
    } catch (error) {
      console.error('Error updating product:', error);
      res.render('admin/product-edit', {
        product: {
          _id: req.params.id,
          name,
          description,
          category,
          brand,
          price: { regular: regularPrice, seller: salesPrice },
          sizes: {
            small: { amount: small, quantity: smallQuantity },
            medium: { amount: medium, quantity: mediumQuantity },
            large: { amount: large, quantity: largeQuantity },
          },
          images: product?.images || [],
        },
        imageError: `Error updating product: ${error.message}`,
      });
    }
};
  
const getdeleteProduct = async(req,res)=>{
    try {
        const prodId = req.query.id;
    
        await Product.findByIdAndUpdate(prodId,{isdeleted:true})
        if (!prodId || prodId.length !== 24) {
            return res.redirect('/admin/productList');
        }
        
        res.redirect('/admin/productList')
    } catch (error) {
        console.log("error",error)
    }
    
}
const UnblockProduct = async(req,res)=>{
    const prodId = req.params.id;
    if(!prodId){
        return res.redirect('/admin/productList')
    }
    await Product.findByIdAndUpdate(prodId,{isListed:true})
    return res.json({success:true,message:"Product id Unblocked"})

}
const blockProduct = async(req,res)=>{
    const prodId = req.params.id
    if(!prodId){
        return res.redirect('/admin/productList')
    }
    await Product.findByIdAndUpdate(prodId,{isListed:false})
    return res.json({success:true,message:"Product id Blocked"})
}

const getCategory = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 5;
        const error = req.query.error;

        const query = {
            isListed: true,
            name: { $regex: new RegExp(search, 'i') }
        };
        const total = await Category.countDocuments(query);
        const totalPage = Math.ceil(total / limit);

        const filterCategory = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('admin/categories', {
            search,
            query,
            totalPage,
            filterCategory,
            page,
            error
        });
        

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal error");
    }
};


const category= async(req,res)=>{
    try {
        const {name,description} = req.body;
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }, 
            isListed:true
          });
          if(existingCategory){
            return res.redirect('/admin/categories?error=Category%20already%20exist')
          }
        await Category.create({name,description})
        
        res.redirect('/admin/categories')
    } catch (error) {
        console.log(error);
        res.redirect('/admin/categories?error=Something went wrong');
    }

} 

const getEditCategory =async (req,res)=>{
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.redirect('/admin/categories?error=Category not found');
        res.render('admin/editCategory', { category });
      } catch (err) {
        console.log(err);   
        res.redirect('/admin/categories?error=Something went wrong');
      }
}
const editCategory = async (req,res)=>{
    try {
        const { name, description } = req.body;
        await Category.findByIdAndUpdate(req.params.id, { name, description });
        res.redirect('/admin/categories');
    } catch (err) {
        console.log(err);
        res.redirect('/admin/categories?error=Edit failed');
    }
      
}

const deleteCategory =async (req,res)=>{
    try {
        const catId = req.params.id;
        await Category.findByIdAndUpdate(catId,{isListed:false});
        res.redirect('/admin/categories')
    } catch (error) {
        console.log(err);
        res.redirect('/admin/categories?error=delete failed');
    }
}

const listOrder = async (req,res)=>{
    const { page = 1, limit = 10, search = '', sort = 'desc' } = req.query;
    const query = search ? { orderId: { $regex: search, $options: 'i' } } : {};

    const orders = await Order.find(query)
    .sort({ updatedAt: sort === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('user');
    const month = moment(orders.createdAt).format('DD MM YYYY')

  const count = await Order.countDocuments(query);
    res.render('admin/orderlist',{ orders, month,page, totalPages: Math.ceil(count / limit), search })

}

const orderDetails = async(req,res)=>{
    const _id = req.params.id
    const order = await Order.findOne({_id}).populate('user').populate('products.productId');
    const prod = order.products.find((prod)=>prod.status)
    const cloudName = process.env.CLOUDINARY_NAME
    
   
    res.render('admin/orderdetails',{order,prod,cloudName})
}

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, selectedStatus,productId } = req.body;
        let order = await Order.findById({_id:orderId});
        let selectedProduct = order.products.find((items) => items._id == productId)
        if(selectedProduct){
            let product = await Product.findById({_id: selectedProduct.productId})
            if(selectedStatus === 'Cancelled'){
                selectedProduct.status = selectedStatus;
                order.markModified('products');
                let wallet = await Wallet.findOne({user:order.user})
                if(!wallet){
                    wallet = new Wallet({user:order.user})
                }
                
                wallet.balance += selectedProduct.price* selectedProduct.quantity
                wallet.transactions.push({
                    amount: selectedProduct.price* selectedProduct.quantity,
                    type: 'credit',
                    description: `Refund for return - Product ID ${selectedProduct.productId}`
                })
                product.sizes[selectedProduct.size].quantity = product.sizes[selectedProduct.size].quantity+selectedProduct.quantity
                await wallet.save()
                await order.save()
                await product.save()
                return res.json({success: true}) 

            }else if(selectedStatus === 'Accept return'){
                selectedProduct.status = 'Returned'
                await Order.findByIdAndUpdate(orderId,{
                    changeStatus: false
                  })
                order.markModified('products')
                
                let wallet = await Wallet.findOne({user:order.user})
                if(!wallet){
                    wallet = new Wallet({user:order.user})
                }
                
                wallet.balance += selectedProduct.price* selectedProduct.quantity
                wallet.transactions.push({
                    amount: selectedProduct.price* selectedProduct.quantity,
                    type: 'credit',
                    description: `Refund for return - Product ID ${selectedProduct.productId}`
                })
                product.sizes[selectedProduct.size].quantity = product.sizes[selectedProduct.size].quantity+selectedProduct.quantity
                await wallet.save()
                await order.save()
                await product.save()
                return res.json({success:true,message:'Product has been returned'})

            }else if(selectedStatus == 'Cancel Return'){
                selectedProduct.status = 'Delivered';
                order.markModified('products')
                await order.save()
                res.json({success: true})
            }else if(selectedStatus == 'Reject return'){
                selectedProduct.status = 'Delivered';
                await Order.findByIdAndUpdate(orderId,{
                    changeStatus: false
                  })
                order.markModified('products')
                await order.save()
                res.json({success: true})
            }else {
                selectedProduct.status = selectedStatus
                await order.save()
                return res.json({success: true}) 
            }
        }else{
            console.log('Product not found in order')
            return res.json({success: false})
        }
    } catch (error) {
        console.log("update status side",error)
        return res.status(500).send("Internal server error")
    }
};

const verifyReturn = async (req, res) => {
    const { orderId, productId } = req.body;
  
    const order = await Order.findById(orderId);
    const product = order.products.find(p => p.productId == productId);
  
    if (product && product.returnRequested && !product.returnVerified) {
      product.returnVerified = true;
      await Order.findByIdAndUpdate(orderId,{
        changeStatus: true
      })
      order.markModified('products');
      await order.save();
  
      const userId = order.user;
      const refundAmount = product.price * product.quantity;
      let wallet = await Wallet.findOne({ user: userId });
  
      if (!wallet) wallet = new Wallet({ user: userId });
  
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        description: `Refund for return - Product ID ${productId}`
      });
  
      await wallet.save();
    }
  
    res.redirect('/admin/orders');
};

const brands = async(req,res)=>{
    try {
        res.render('admin/brand')
    } catch (error) {
        console.log("brand page",error)
    }
}

const getSalesReport = async (req, res) => {
    try {
        const allOrders = await Order.find({}).populate('products.productId').populate('user').sort({_id:-1})
        const deliveredOrders = allOrders.map(order => {
            const deliveredProducts = order.products.filter(p => p.status === 'Delivered');
            return {
            ...order.toObject(),
            products: deliveredProducts
            };
            
        })
        .filter(order => order.products.length > 0)
        res.render('admin/sales-report', { deliveredOrders})
    } catch (error) {
        console.log(error);
    }
}

const customDate = async (req, res) => {
    try {
        const { value: startDateStr, value2: endDateStr } = req.query;

        const startParts = startDateStr.split("-");
        const endParts = endDateStr.split("-");

        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0);
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);

        const allOrders = await Order.find({
            updatedAt: { $gte: startDate, $lte: endDate }
        })
        .populate('products.productId')
        .populate('user')
        .sort({ _id: -1 });

        const deliveredOrders = allOrders
            .map(order => {
                const deliveredProducts = order.products.filter(p => p.status === 'Delivered');
                return {
                    ...order.toObject(),
                    products: deliveredProducts
                };
            })
            .filter(order => order.products.length > 0);

        res.render("admin/sales-report", { deliveredOrders });

    } catch (error) {
        console.log("Custom Date Filter Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


const filterDate = async (req, res) => {
    try {
        const sort = req.query.value;
        const currentDate = new Date();
        let dateFilter = {};

        if (sort === "Day") {
            const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
            dateFilter = { updatedAt: { $gte: startOfDay, $lte: endOfDay } };

        } else if (sort === "Week") {
            const firstDayOfWeek = new Date(currentDate);
            firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            firstDayOfWeek.setHours(0, 0, 0, 0);

            const lastDayOfWeek = new Date(currentDate);
            lastDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: firstDayOfWeek, $lte: lastDayOfWeek } };

        } else if (sort === "Month") {
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } };

        } else if (sort === "Year") {
            const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
            const lastDayOfYear = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: firstDayOfYear, $lte: lastDayOfYear } };
        }

        const allOrders = await Order.find(dateFilter)
            .populate('products.productId')
            .populate('user')
            .sort({ _id: -1 });

        const deliveredOrders = allOrders
            .map(order => {
                const deliveredProducts = order.products.filter(p => p.status === 'Delivered');
                return {
                    ...order.toObject(),
                    products: deliveredProducts
                };
            })
            .filter(order => order.products.length > 0);

        res.render("admin/sales-report", { deliveredOrders });

    } catch (error) {
        console.log("Filter Date Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {getLogin,
                  adminLogin,
                  getDashboard,
                  adminLogout,
                  getUser,
                  blockUser,
                  getProducts,
                  getAddProduct,
                  addProducts,
                  getCategory,
                  category,
                  editCategory,
                  getEditCategory,
                  deleteCategory,
                  loadProduct,
                  editProduct,
                  getdeleteProduct,
                  listOrder,
                  orderDetails,
                  updateOrderStatus,
                  verifyReturn,
                  productDetails,
                  UnblockProduct,
                  blockProduct,
                  brands,
                  getSalesReport,
                  filterDate,
                  customDate
                  
                }