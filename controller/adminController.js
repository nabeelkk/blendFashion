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
const Brand = require('../modal/brandModal')
const fs = require('fs').promises;
const path = require('path');




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
        const hashed = await bcrypt.hash(password,10)
        console.log(hashed)
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
        const limit = 6;
        const category = req.query.category
        const cloudName = process.env.CLOUDINARY_NAME;
        const query={
            isdeleted:false,
            name:{$regex : new RegExp(search,'i')},
        }
        if(category){
            query.category = category
        }
        

        const total = await Product.countDocuments(query);
        const totalPage = Math.ceil(total/limit);
        
        const categories = await Category.find({ isListed: true });
        const product = await Product.find(query)
        .sort({createdAt:-1})
        .skip((page - 1)*limit)
        .limit(limit)
        .populate("category");
        let salePrice =0;
        let offer = 0
        for(let prod of product){
             offer = prod.sizes.small?.amount ? prod.sizes.small?.amount:0
             salePrice =prod.sizes.small?.amount?(prod.sizes.small?.Mrp * prod.sizes.small?.amount)/100:prod.sizes.small?.Mrp 
            
        }
        console.log(product,"sssddss")
        res.render('admin/productList',{totalPage,search,page,product,cloudName,salePrice,offer,categories,category})


    } catch (error) {
        console.log(error)
    }
   
}
const productDetails = async(req,res)=>{
    try {
        const prodId=req.params.prodId
        
        const categories = await Category.find({ isListed: true });
        const cloudName = process.env.CLOUDINARY_NAME
        const product = await Product.findOne({_id:prodId}).populate('category')
        res.render('admin/productDetails',{product,cloudName,categories})
    } catch (error) {
        console.log('productDetails admin side',error)
        return res.status(500).send('Internal error')
    }
}

const getAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isListed: true });
        const sizeError = req.query.errorsize;
        const imageError = req.query.errorimage;
        const error = req.query.error;
        res.render('admin/addProduct', { category: categories, sizeError, imageError, brand: brands,error });
    } catch (error) {
        console.error('Error in getAddProduct:', error);
        res.status(500).send('Internal server error');
    }
};
const addProducts = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            brand,
            MaxPriceSmall, SalesPriceSmall, StockSmall,
            MRPMedium, SalesPriceMedium, StockMedium,
            MRPLarge, SalesPriceLarge, StockLarge,
            MRPXL,SalesPriceXL,StockXL
            
        } = req.body;
        console.log(req.body)

        if (!name || !name.match(/^[A-Za-z][A-Za-z0-9\s&]{2,49}$/)) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Product name must be 3-50 characters (letters, numbers, spaces only)')}`);
        }

        if (!description || description.length < 10 || description.length > 500) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Description must be 10-500 characters')}`);
        }

        if (!category) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Please select a category')}`);
        }

        const sizes = {
            small: MaxPriceSmall && SalesPriceSmall && StockSmall !== undefined ? {
                Mrp: parseFloat(MaxPriceSmall),
                amount: parseFloat(SalesPriceSmall),
                quantity: parseInt(StockSmall) || 0
            } : null,
            medium: MRPMedium && SalesPriceMedium && StockMedium !== undefined ? {
                Mrp: parseFloat(MRPMedium),
                amount: parseFloat(SalesPriceMedium),
                quantity: parseInt(StockMedium) || 0
            } : null,
            large: MRPLarge && SalesPriceLarge && StockLarge !== undefined ? {
                Mrp: parseFloat(MRPLarge),
                amount: parseFloat(SalesPriceLarge),
                quantity: parseInt(StockLarge) || 0
            } : null,
            XL: MRPXL && SalesPriceXL && StockXL !== undefined ? {
                Mrp: parseFloat(MRPXL),
                amount: parseFloat(SalesPriceXL),
                quantity: parseInt(StockXL) || 0
            } : null
        };


        const hasValidSize = Object.values(sizes).some(size => size !== null);
        if (!hasValidSize) {
            return res.redirect('/admin/addProducts?errorsize=At%20least%20one%20size%20(small,%20medium,%20or%20large%20Xl)%20must%20be%20provided%20with%20valid%20MRP,%20Offer,%20and%20Stock');
        }

        for (const size of ['small', 'medium', 'large']) {
            if (sizes[size]) {
                if (isNaN(sizes[size].Mrp) || sizes[size].Mrp < 0) {
                    return res.redirect(`/admin/addProducts?errorsize=MRP%20for%20${size}%20must%20be%20a%20positive%20number`);
                }
                if (isNaN(sizes[size].amount) || sizes[size].amount < 0) {
                    return res.redirect(`/admin/addProducts?errorsize=Offer%20for%20${size}%20must%20be%20a%20positive%20number`);
                }
                if (sizes[size].amount > 99) {
                    return res.redirect(`/admin/addProducts?errorsize=Offer%20for%20${size}%20cannot%20be%20greater%20than%2099`);
                }
                if (sizes[size].quantity < 0 || !Number.isInteger(sizes[size].quantity)) {
                    return res.redirect(`/admin/addProducts?errorsize=Stock%20for%20${size}%20must%20be%20a%20non-negative%20integer`);
                }
            }
        }

        for (const size of ['small', 'medium', 'large']) {
            if (sizes[size]) {
                sizes[size] = {
                    Mrp: sizes[size].Mrp,
                    amount: sizes[size].amount,
                    quantity: sizes[size].quantity
                };
            } else {
                sizes[size] = {
                    Mrp: 0,
                    amount: 0,
                    quantity: 0
                };
            }
        }

        const files = req.files?.images;
        if (!files || (Array.isArray(files) ? files.length : 1) < 3) {
            return res.redirect('/admin/addProducts?errorimage=At%20least%203%20images%20are%20required');
        }
        if (Array.isArray(files) && files.length > 3) {
            return res.redirect('/admin/addProducts?errorimage=Maximum%20of%203%20images%20allowed');
        }

        const fileArray = Array.isArray(files) ? files : [files];
        const images = [];
        for (let file of fileArray) {
            if (!file.mimetype.match(/image\/(jpeg|png|webp)/)) {
                return res.redirect('/admin/addProducts?errorimage=Only%20JPEG,%20PNG,%20or%20WebP%20images%20are%20allowed');
            }
            if (file.size > 5 * 1024 * 1024) {
                return res.redirect('/admin/addProducts?errorimage=Each%20image%20must%20be%20less%20than%205MB');
            }

            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: 'blend_products',
                width: 600,
                height: 600,
                crop: 'fill',
                gravity: 'auto',
                format: 'jpeg',
                quality: 'auto'
            });
            images.push(result.public_id);
        }

        const newProduct = new Product({
            name,
            description,
            category,
            brand,
            sizes,
            images
        });

        await newProduct.save();
        res.redirect('/admin/productList');
    } catch (error) {
        console.error('Error in addProducts:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message).join(', ');
            return res.redirect(`/admin/addProducts?errorsize=${encodeURIComponent(errors)}`);
        }
        if (error.code === 11000) {
            return res.redirect('/admin/addProducts?errorsize=Product%20name%20already%20exists');
        }
        res.redirect('/admin/addProducts?errorsize=Internal%20server%20error');
    }
};

const loadProduct = async(req,res)=>{
   try {
    const product = await Product.findOne({_id:req.params.id,isdeleted:false})
    const category = await Category.find({isListed:true})
    const brand = await Brand.find({isListed:true})
    const cloudName = process.env.CLOUDINARY_NAME;
    const error = req.query.error

    res.render('admin/editProduct',{product,category,cloudName,brand,error})
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
            MaxPriceSmall, SalesPriceSmall, StockSmall,
            MRPMedium, SalesPriceMedium, StockMedium,
            MRPLarge, SalesPriceLarge, StockLarge,
            MRPXL, SalesPriceXL, StockXL
        } = req.body;


        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Product not found')}`);
        }

        if (!name || !name.match(/^[A-Za-z][A-Za-z0-9\s&]{2,49}$/)) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Product name must be 3-50 characters (letters, numbers, spaces only)')}`);
        }

        if (!description || description.length < 10 || description.length > 500) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Description must be 10-500 characters')}`);
        }

        if (!category) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Please select a category')}`);
        }

        const sizes = {};
        const sizeFieldNames = {
            small: { mrp: MaxPriceSmall, sales: SalesPriceSmall, stock: StockSmall },
            medium: { mrp: MRPMedium, sales: SalesPriceMedium, stock: StockMedium },
            large: { mrp: MRPLarge, sales: SalesPriceLarge, stock: StockLarge },
            xl: { mrp: MRPXL, sales: SalesPriceXL, stock: StockXL }
        };
        const sizesToUpdate = ['small', 'medium', 'large', 'xl'];
        let atLeastOneSizeProvided = false;

        for (const size of sizesToUpdate) {
            const { mrp, sales, stock } = sizeFieldNames[size];

            if (mrp || sales || stock) {
                if (!mrp || !sales || stock === undefined || stock === '') {
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`All fields (MRP, Sales Price, Stock) for size ${size} must be provided if any are specified`)}`);
                }

                const mrpNum = parseFloat(mrp);
                const salesNum = parseFloat(sales);
                const stockNum = parseInt(stock);

                if (isNaN(mrpNum) || mrpNum < 0) {
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`MRP for ${size} must be a positive number`)}`);
                }
                if (isNaN(salesNum) || salesNum < 0) {
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`Offer ${size} must be a positive number`)}`);
                }
                if (salesNum > 99) {
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`Offer for ${size} cannot be greater than 100`)}`);
                }
                if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`Stock for ${size} must be a non-negative integer`)}`);
                }

                sizes[size] = { Mrp: mrpNum, amount: salesNum, quantity: stockNum };
                atLeastOneSizeProvided = true;
            } else if (product.sizes[size]) {
                sizes[size] = product.sizes[size]; 
            }
        }

        if (!atLeastOneSizeProvided) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('At least one size must have valid MRP, Offer, and Stock')}`);
        }

        let images = [...(product.images || [])];

        if (req.files) {

            for (let i = 0; i < images.length; i++) {
                const replaceField = `replaceImage[${i}]`;
                if (req.files[replaceField]) {
                    const file = req.files[replaceField];
                    const tempPath = file.tempFilePath;
                   if (!file.mimetype.match(/image\/(jpeg|png|webp)/)) {
                        await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                        return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Only JPEG, PNG, or WebP images are allowed')}`);
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                        return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Each image must be less than 5MB')}`);
                    }

                    const result = await cloudinary.uploader.upload(tempPath, {
                        folder: 'blend_products',
                        width: 600,
                        height: 600,
                        crop: 'fill',
                        gravity: 'auto',
                        format: 'jpeg',
                        quality: 'auto'
                    });

                    if (images[i]) {
                        await cloudinary.uploader.destroy(images[i]);
                    }

                    images[i] = result.public_id;

                    await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                }
            }

            if (req.files.newImages) {
                const newFiles = Array.isArray(req.files.newImages) ? req.files.newImages : [req.files.newImages];
                if (images.length + newFiles.length > 3) {
                    for (const file of newFiles) {
                        await fs.unlink(file.tempFilePath).catch(err => console.error('Error deleting temp file:', err));
                    }
                    return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Total images cannot exceed 3')}`);
                }

                for (const file of newFiles) {
                    const tempPath = file.tempFilePath;

                    if (!file.mimetype.match(/image\/(jpeg|png|webp)/)) {
                        await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                        return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Only JPEG, PNG, or WebP images are allowed')}`);
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                        return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Each image must be less than 5MB')}`);
                    }

                    const result = await cloudinary.uploader.upload(tempPath, {
                        folder: 'blend_products',
                        width: 600,
                        height: 600,
                        crop: 'fill',
                        gravity: 'auto',
                        format: 'jpeg',
                        quality: 'auto'
                    });

                    images.push(result.public_id);

                    await fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
                }
            }
        }

        if (images.length < 1 || images.length > 3) {
            return res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent('Product must have 1 to 3 images')}`);
        }

        product.name = name;
        product.description = description;
        product.category = category;
        product.brand = brand;
        product.sizes = sizes;
        product.images = images;

        await product.save();

        res.redirect('/admin/productList');
    } catch (error) {
        console.error('Error updating product:', error);
        if (req.files) {
            for (let i = 0; i < (product?.images?.length || 0); i++) {
                const replaceField = `replaceImage[${i}]`;
                if (req.files[replaceField]) {
                    await fs.unlink(req.files[replaceField].tempFilePath).catch(err => console.error('Error deleting temp file:', err));
                }
            }
            if (req.files.newImages) {
                const newFiles = Array.isArray(req.files.newImages) ? req.files.newImages : [req.files.newImages];
                for (const file of newFiles) {
                    await fs.unlink(file.tempFilePath).catch(err => console.error('Error deleting temp file:', err));
                }
            }
        }
        res.redirect(`/admin/editProduct/${req.params.id}?error=${encodeURIComponent(`Error updating product: ${error.message}`)}`);
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
    return res.json({success:true,message:"Product is Unblocked"})

}
const blockProduct = async(req,res)=>{
    const prodId = req.params.id
    if(!prodId){
        return res.redirect('/admin/productList')
    }
    await Product.findByIdAndUpdate(prodId,{isListed:false})
    return res.json({success:true,message:"Product is Blocked"})
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
    const couponDiscount = order.coupon
    const prod = order.products.find((prod)=>prod.status)
    const cloudName = process.env.CLOUDINARY_NAME
    
   
    res.render('admin/orderdetails',{order,prod,cloudName,couponDiscount:Number(couponDiscount).toFixed(2)})
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
      let wallet = await Wallet.findOne({ user: userId });
  
      if (!wallet) wallet = new Wallet({ user: userId });

      if (order.paymentMethod === "Card") {
      
      const mrp = Number(product.price) || 0;
      const discount = Number(product.discount) || 0;
      const coupon = Number(product.coupon) || 0;
      const quantity = Number(product.quantity) || 1;
      console.log(mrp,    discount    ,    coupon   ,    quantity)
      let refundAmount = 0;

      refundAmount = (mrp * quantity) - coupon;
      if(coupon){
        refundAmount = (mrp * quantity) - (coupon/order.length);
      }
      console.log(refundAmount,"rfund amount")

      if (!isNaN(refundAmount) && refundAmount > 0) {
        wallet.balance = Number(wallet.balance || 0) + refundAmount;

        wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          date: new Date(),
          description: `Refund for Returned product: ${product.name}`,
        });
      } else {
        console.warn("Refund skipped due to invalid amount:", refundAmount);
      }

    }
  
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
        const now = new Date(); 
        let dateFilter = {};

        // Set filter based on the sort value
        if (sort === "Day") {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: startOfDay, $lte: endOfDay } };

        } else if (sort === "Week") {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(now);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: startOfWeek, $lte: endOfWeek } };

        } else if (sort === "Month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: startOfMonth, $lte: endOfMonth } };

        } else if (sort === "Year") {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);
            endOfYear.setHours(23, 59, 59, 999);

            dateFilter = { updatedAt: { $gte: startOfYear, $lte: endOfYear } };
        }

        // Validate dateFilter values
        const range = dateFilter.updatedAt;
        if (range && (isNaN(range.$gte) || isNaN(range.$lte))) {
            return res.status(400).send("Invalid date range provided.");
        }

        const allOrders = await Order.find(dateFilter)
            .populate('products.productId')
            .populate('user')
            .sort({ _id: -1 });

        // Filter delivered products
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
        console.error("Filter Date Error:", error);
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