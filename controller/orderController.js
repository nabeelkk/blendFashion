const User = require('../modal/userModal')
const Order = require('../modal/orderModal')
const Cart = require('../modal/cartModal')
const Product = require('../modal/productModal')
const moment = require('moment')
const Razorpay = require('razorpay')
const crypto = require('crypto');
const { applyBestOffer } = require('../utils/offerUtil');
const Coupon = require('../modal/coupenModel')
const Offer = require('../modal/offerModal')
const Wallet = require('../modal/walletModal')


const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_SECRET_KEY
})

const myOrder = async(req,res)=>{
    try {
        const searchQuery = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1)*limit
        const userId = req.session.user._id
        const cloudName = process.env.CLOUDINARY_NAME
        const cart  = await Cart.find({userId:req.session.user._id})
        const order = await Order.find({user:req.session.user._id})
        
        let cartCount
        const searchFilter = {
            user: userId,
            $or:[
                {orderId:{$regex:searchQuery,$options:'i'}},
                {'products.productName':{$regex:searchQuery,$options:'i'}},
                
            ]
        }
        const orders = await Order.find(searchFilter)
        .populate({
            path: 'products.productId',
            model: 'Products'
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        const totalOrder = await Order.countDocuments(searchFilter)
        const totalPage = Math.ceil(totalOrder/limit)
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        let formattedDate  
        order.forEach((ord)=> formattedDate = ord.createdAt.toLocaleDateString('en-GB', options))


        res.render('users/myOrders',{user:req.session.user,orders,cloudName,page,totalPage,searchQuery,cartCount,formattedDate})
    } catch (error) {
        console.log("my order page side",error)
        return res.status(500).send("Internal error")
    }
}

const orderPlaced = async(req,res)=>{
    try {
        const cart = await Cart.findOne({userId:req.session.user._id})
        res.render('users/orderPlaced',{user:req.session.user,cart})
    } catch (error) {
        console.log('order Placed side',error)
        return res.status(500).send("Internal Error")
    }
    
}

const placeOrder = async(req,res)=>{
    try {
        const {defaultAddress,paymentMethod} = req.body
        const userId = req.session.user._id
        const user = await User.findById(userId)
        const selectedAddress = user.address.find((addr=>addr.id.toString()===defaultAddress))
        const cart = await Cart.findOne({userId}).populate('products.productId')
        const categoryOffer = await Offer.find({type:'category',isActive:true}).populate('category')
        if (!cart || cart.products.length === 0) return res.redirect('/cart');
        const coupen = req.session.user.discountedTotal
        const couponDiscount = req.session.user.discountAmount
        const orderId = "#ORD"+Date.now();
        const orderedProducts = [];
        let orderedAmount=0
        let discount = 0
        for (const item of cart.products) {
            const product = item.productId;
            const category = product.category
            const size = item.size
            const price = item.price
            if(item.quantity>product.sizes[size].quantity){
                return res.json({success:false,message:`Sorry... ${item.size} quantity is out of stock`})
            }

            const MRP = product.sizes[size].Mrp;

            const itemTotalMrp = MRP * item.quantity;

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
                    productDiscount = (MRP - discountedPrice) * item.quantity;
                }
                discount += productDiscount;
                orderedAmount += ((MRP * item.quantity) - (productDiscount)) 
                if(coupen){
                  orderedAmount = coupen
                }

            orderedProducts.push({
              productId: product._id,   
              productName:product.name,
              quantity: item.quantity,
              price: MRP,
              size: size,
              status:'Placed',
              MRP: itemTotalMrp,
              totalAmount:orderedAmount,
              discount: discount.toFixed(2),
              coupon:couponDiscount?couponDiscount.toFixed(2):0
            });
      
            product.sizes[size].quantity -= item.quantity;
            await product.save();
          }
          if(paymentMethod == 'Wallet'){

            const wallet = await Wallet.findOne({user:userId})
            if(wallet.balance<orderedAmount){
              return res.json({success:false,message:"Insufficient balance in wallet"})
            }

            const newOrder = new Order({
              user: userId,
              orderId,
              products: orderedProducts,
              totalAmount:orderedAmount,
              totalDiscount:discount.toFixed(2),
              coupon:couponDiscount?.toFixed(2),
              paymentMethod: paymentMethod,
              status: "Placed",
              address: selectedAddress
            });
            
             wallet.balance -= orderedAmount
             wallet.transactions.push({
              amount: orderedAmount,
              type: "debit",
              date: new Date(),
              description: `Wallet Payment for Order ${orderId}`,
            });
            await newOrder.save();
            await wallet.save()

          }else{
            const newOrder = new Order({
              user: userId,
              orderId,
              products: orderedProducts,
              totalAmount:orderedAmount,
              totalDiscount:discount.toFixed(2),
              coupon:couponDiscount?.toFixed(2),
              paymentMethod: paymentMethod,
              status: "Placed",
              address: selectedAddress
            });
            await newOrder.save();
          }
          await Cart.findOneAndUpdate({ userId }, { products: [] });

        return res.json({success:true,message:"success"})

        
    } catch (error) {
        console.log("place order side",error);
        return res.status(500).send("Internal error")
    }
}


const  orderdetails =async (req,res)=>{
    try {
        if(!req.session.user){
            return res.redirect('/login')
        }
        const orderId = req.params.orderId
        const orders = await Order.findOne({_id:orderId ,user:req.session.user._id }).populate('products.productId')
        if(!orders){
            return res.redirect('/')
        }
        const couponDiscount = orders?.coupon
        let productElem;
        orders.products.forEach(element => {
            productElem = element
        });
        const user = await User.findById({_id:req.session.user._id})
        let address
        user.address.forEach((add)=>address = add.id.toString())
        const cart = await Cart.find({userId:req.session.user._id})
        let cartCount 
        cart.forEach((elem)=>cartCount = elem.products.length)

     
        const month = moment(orders.createdAt).format('DD MM YYYY')
        const cloudName = process.env.CLOUDINARY_NAME
        res.render('users/orderDetails',{user:req.session.user,orders,orderId,month,cloudName,productElem,cartCount,cart,address,couponDiscount:couponDiscount?Number(couponDiscount).toFixed(2):'0.00'})
    } catch (error) {
        console.log("order Details side",error)
        return res.status(500).send("Internal server error")
    }
}

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { productId, orderId, reason } = req.body;

    const order = await Order.findOne({ _id: orderId }).populate('products.productId');
    if (!order) return res.status(404).send("Order not found");

    const product = order.products.find(
      (p) => p._id.toString() === productId
    );

    if (!product || product.status === "Cancelled") {
      return res.json({
        success: false,
        message: "Product already cancelled",
      });
    }

    product.status = "Cancelled";
    if (reason) product.cancelReason = reason;

    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({ user: order.user, balance: 0, transactions: [] });
    }

    if (order.paymentMethod === "Card") {
      
      const mrp = Number(product.MRP) || 0;
      const discount = Number(product.discount) || 0;
      const coupon = Number(product.coupon) || 0;
      const quantity = Number(product.quantity) || 1;
      let refundAmount = 0;
      refundAmount = mrp - (quantity * discount);
      if(coupon){
        refundAmount = mrp - (quantity * discount) - (coupon/order.products.length)
      }

      if (!isNaN(refundAmount) && refundAmount > 0) {
        wallet.balance = Number(wallet.balance || 0) + refundAmount;

        wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          date: new Date(),
          description: `Refund for cancelled product: ${product.name}`,
        });
      } else {
        console.warn("Refund skipped due to invalid amount:", refundAmount);
      }

    }

    const pdt = await Product.findById(product.productId);
    if (pdt?.sizes?.[product.size]) {
      pdt.sizes[product.size].quantity += product.quantity;
      await pdt.save();
    }

    await order.save();
    await wallet.save();

    return res.json({ success: true, message: "Product cancelled and refunded" });

  } catch (error) {
    console.log("order cancel side", error);
    return res.status(500).send("Internal server error");
  }
};


const bulkCancel = async (req, res) => {
    try {
        const { orderId, cancelReason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        let productsToUpdate = []; 

        for (let val of order.products) {
            if (['Shipped', 'Placed', 'Pending', 'Out of Delivery'].includes(val.status)) {
                val.status = 'Cancelled'; 
                const product = await Product.findById(val.productId);
                if (product && product.sizes[val.size]) {
                    product.sizes[val.size].quantity += val.quantity;
                    productsToUpdate.push(product);
                }
            }
        }

        await order.save();

        for (let product of productsToUpdate) {
            await product.save();
        }

        return res.json({ success: true, message: "Order cancelled successfully" });

    } catch (error) {
        console.log("Bulk cancel error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const returnProduct = async(req,res)=>{
    try {
        const {orderId,prodId,currentStatus} = req.body
        const order = await Order.findById({_id:orderId})
        let product = order.products.find((item)=> item._id == prodId) 
        if(product.status === 'Delivered'){
            product.status = 'Return Processing';
            order.markModified('products');
            await Order.findByIdAndUpdate(orderId,{
                changeStatus: true
            })
            await order.save()
            return res.json({success: true, message:'Order return processing'})
        }else{
            return res.json({success: false,message:'Only Delivered products can be returned'})
        }
    } catch (error) {
        console.log("Return Product side",error)
        return res.status(500).send("Internal error")
    }
}
const invoice = async(req,res)=>{
    try {
        const orderId = req.params.id
        const order = await Order.findById({_id:orderId,user: req.session.user._id}).populate('products.productId').populate('user')
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/myOrder');
        }
        
        res.render('users/invoice',{order})
    } catch (error) {
        console.log('invoice side ',error)
        return res.status(500).send("Internal Server Error")
    }
}

const createRazorpayOrder = async (req, res) => {
  try {
    const { defaultAddress, totalAmount, retryOrderId } = req.body;

    const cart = await Cart.findOne({ userId: req.session.user._id }).populate("products.productId");
    const categoryOffer = await Offer.find({ type: 'category', isActive: true }).populate('category');

    if (!defaultAddress || !totalAmount || !cart || !cart.products) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    const user = await User.findById(req.session.user._id).populate("address");
    if (!user) return res.status(401).json({ error: "User not found" });

    let selectedAddress = null;
    if (Array.isArray(user.address)) {
      selectedAddress = user.address.find(a => a && a.id && a.id.toString() === defaultAddress);
    } else if (user.address && user.address.id && user.address.id.toString() === defaultAddress) {
      selectedAddress = user.address;
    }

    if (!selectedAddress) return res.status(400).json({ error: "Invalid address" });

    const addressToSend = {
      name: selectedAddress.name,
      mobile: selectedAddress.mobile,
      addressLine: selectedAddress.addressLine,
      locality: selectedAddress.locality,
      city: selectedAddress.city,
      district: selectedAddress.district,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
    };

    const coupon = req.session.user.discountedTotal;
    const couponDiscount = req.session.user.discountAmount;

    let order = null;
    if (retryOrderId) {
      order = await Order.findById(retryOrderId);
      if (!order || order.user.toString() !== req.session.user._id.toString() || order.paymentStatus !== 'Pending') {
        return res.status(400).json({ error: "Invalid or unauthorized retry order" });
      }
    }

    let discount = 0;
    let orderedAmount = 0;

    const items = cart.products.map(async (item) => {
      if (!item.productId || !item.productId.name || typeof item.price !== "number" || isNaN(item.price)) {
        throw new Error(`Invalid product data: ${JSON.stringify(item)}`);
      }

      const product = item.productId;
      const size = item.size;
      const price = item.price;
      const category = product.category;

      if (item.quantity > product.sizes[size].quantity) {
        return res.json({ success: false, message: `Sorry... ${item.size} quantity is out of stock` });
      }

      const MRP = product.sizes[size].Mrp;
      const today = new Date();
      const productOffer = MRP - price;

      let categoryDiscount = 0;
      const matchingCategoryOffer = categoryOffer.find(offer =>
        offer.category._id.toString() === category._id.toString() &&
        new Date(offer.startDate) <= today &&
        new Date(offer.endDate) >= today
      );

      if (matchingCategoryOffer) {
        categoryDiscount = (MRP * matchingCategoryOffer.discount) / 100;
      }

      const appliedOffer = Math.max(productOffer, categoryDiscount);
      const discountedPrice = MRP - appliedOffer;
      const productDiscount = (MRP - discountedPrice) * item.quantity;

      discount += productDiscount;
      orderedAmount += (MRP * item.quantity - productDiscount);
      if (coupon) {
        orderedAmount = coupon;
      }

      return {
        name: product.name,
        amount: Math.round(price * 100),
        quantity: item.quantity || 1,
        image: product.images[0]
          ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${product.images[0]}`
          : "",
        size: size || "N/A",
        productId: product._id.toString(),
      };
    });

    const resolvedItems = await Promise.all(items);
    if (resolvedItems.length === 0) return res.status(400).json({ error: 'No valid products in cart' });

    const totalInPaise = parseInt(totalAmount);
    if (isNaN(totalInPaise) || totalInPaise <= 0) {
      return res.status(400).json({ error: "Invalid total amount" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET_KEY) {
      throw new Error("Razorpay credentials are missing");
    }

    const options = {
      amount: totalInPaise * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        defaultAddress,
        totalPrice: totalInPaise.toString(),
        retryOrderId: retryOrderId || null,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      order_id: razorpayOrder.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount,
      user: {
        name: user.name || "Customer",
        email: user.email,
        contact: user.mobile || "9123456780",
      },
      address: addressToSend,
      items: resolvedItems,
      totalDiscount: discount.toFixed(2),
      coupon: couponDiscount ? couponDiscount.toFixed(2) : '0.00'
    });
  } catch (error) {
    console.error("Razorpay Error:", error);
    if (error.response && error.response.error) {
      return res.status(500).json({ error: error.response.error.description || "Razorpay order creation failed" });
    }
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
};


const handlePaymentSuccess = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, retryOrderId } = req.body;
    const categoryOffer = await Offer.find({ type: 'category', isActive: true }).populate('category');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing Razorpay payment details:', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
      return res.status(400).json({ error: 'Missing payment details' });
    }

    if (!process.env.RAZORPAY_SECRET_KEY) {
      return res.status(500).json({ error: 'Server configuration error: Missing Razorpay key secret' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Invalid payment signature:', { generatedSignature, razorpay_signature });
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    const user = await User.findById(req.session.user._id);
    if (!user || user._id.toString() !== razorpayOrder.notes.userId) {
      return res.status(401).json({ error: 'Unauthorized or invalid user' });
    }

    const addressId = razorpayOrder.notes.defaultAddress;
    const address = user.address.find(addr => addr.id.toString() === addressId);

    if (!address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const cart = await Cart.findOne({ userId: user._id }).populate('products.productId');
    if (!cart || !cart.products.length) {
      return res.status(400).json({ error: 'Cart not found or is empty' });
    }
    const coupon = req.session.user.discountedTotal
    const couponDiscount = req.session.user.discountAmount
    
    let discount = 0;
    let orderedAmount = 0;
    
    const productsWithMRP = [];
    
    for (const item of cart.products) {
      const product = item.productId;
      const size = item.size;
      const price = item.price;
      const quantity = item.quantity;
      const category = product.category;

      if (quantity > product.sizes[size].quantity) {
        return res.json({ success: false, message: `Sorry... ${size} quantity is out of stock` });
      }

      const itemMRP = product.sizes[size].Mrp; 
      const today = new Date();
      const productOffer = itemMRP - price;
      let categoryDiscount = 0;

      const matchingCategoryOffer = categoryOffer.find(offer =>
        offer.category._id.toString() === category._id.toString() &&
        new Date(offer.startDate) <= today &&
        new Date(offer.endDate) >= today
      );

      if (matchingCategoryOffer) {
        categoryDiscount = (itemMRP * matchingCategoryOffer.discount) / 100;
      }

      const appliedOffer = Math.max(productOffer, categoryDiscount);
      let productDiscount = 0;
      if (appliedOffer > 0) {
          const discountedPrice = itemMRP - appliedOffer;
          productDiscount = (itemMRP - discountedPrice) * item.quantity;
      }
      discount += productDiscount;
      orderedAmount += ((itemMRP * item.quantity) - (productDiscount));
       if (coupon) {
        orderedAmount = coupon;
      }
      productsWithMRP.push({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || 'N/A',
        discount: productDiscount.toFixed(2),
        totalAmount:orderedAmount,
        MRP: itemMRP, 
        status: "Placed",
        coupon: couponDiscount ? couponDiscount.toFixed(2) : 0,
        image: item.productId.images && item.productId.images[0]
          ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${item.productId.images[0]}`
          : '',
      });
    }
    
   

    let order;
    if (retryOrderId) {
      order = await Order.findById(retryOrderId);
      if (!order || order.user.toString() !== user._id.toString() || order.paymentStatus !== 'Pending') {
        return res.status(400).json({ error: 'Invalid or unauthorized retry order' });
      }

      order.products = productsWithMRP;
      order.paymentStatus = 'Completed';
      order.paymentId = razorpay_payment_id;
      order.razorPayId = razorpay_order_id;
      order.status = 'Completed';
    } else {
      order = new Order({
        user: user._id,
        paymentMethod: 'Card',
        products: productsWithMRP,
        totalAmount: orderedAmount,
        paymentStatus: 'Completed',
        paymentId: razorpay_payment_id,
        razorPayId: razorpay_order_id,
        orderId: '#ORD' + Date.now(),
        address,
        status: 'Completed',
        totalDiscount: discount.toFixed(2),
        coupon: couponDiscount ? couponDiscount.toFixed(2) : 0
      });
    }

    for (const item of cart.products) {
      const product = item.productId;
      const size = item.size;
      product.sizes[size].quantity -= item.quantity;
      await product.save();
    }
    req.session.defaultAddressId = null;
    req.session.user.discountAmount = null;
    req.session.user.discountAmount = null;
    await order.save();
    await Cart.findOneAndUpdate({ userId: user._id }, { $set: { products: [] } });

    res.render('users/checkoutsuccess', { orderId: razorpay_order_id, user, order, address });
  } catch (error) {
    console.error('Payment Success Error:', error.message, error.stack);
    res.redirect('/checkoutfailure');
  }
};


const handleCheckoutFailure = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    const defaultAddressId = req.session.defaultAddressId;
    const cart = await Cart.findOne({ userId: req.session.user._id }).populate('products.productId');
    const user = await User.findById(req.session.user._id);
    const categoryOffer = await Offer.find({type:'category',isActive:true}).populate('category')
    let selectedAddress = null;

    if (Array.isArray(user.address)) {
      selectedAddress = user.address.find(a => a && a.id && a.id.toString() === defaultAddressId);
    } else if (user.address && user.address.id && user.address.id.toString() === defaultAddressId) {
      selectedAddress = user.address;
    }

    if (!selectedAddress) {
      return res.redirect('/checkout');
    }

    let totalPrice = 0;
    cart.products.forEach((prod) => {
      totalPrice += prod.price * prod.quantity;
    });
    const coupon = req.session.user.discountedTotal
    const couponDiscount = req.session.user.discountAmount
    let discount = 0
    let orderedAmount = 0
    
    const productsWithMRP = [];
    
    for (const item of cart.products) {
      const product = item.productId;
      const price = item.price
      const size = item.size;
      const category = product.category
      if (item.quantity > product.sizes[size].quantity) {
        return res.json({ success: false, message: `Sorry... ${item.size} quantity is out of stock` });
      }
      
      const itemMRP = product.sizes[size].Mrp; 

      const today = new Date()
      const productOffer = itemMRP - price
      let categoryDiscount = 0
      let appliedOffer = 0
      if(category){
          const matchingCategoryOffer = categoryOffer.find(offer =>
              offer.category._id.toString() === category._id.toString() &&
              new Date(offer.startDate) <= today &&
              new Date(offer.endDate) >= today
          );
      
          if (matchingCategoryOffer) {
              categoryDiscount = (itemMRP * matchingCategoryOffer.discount) / 100;
          }
      }

      appliedOffer = Math.max(productOffer, categoryDiscount);

      let productDiscount = 0;
      if (appliedOffer > 0) {
          const discountedPrice = itemMRP - appliedOffer;
          productDiscount = (itemMRP - discountedPrice) * item.quantity;
      }
      discount += productDiscount;
      orderedAmount += ((itemMRP * item.quantity) - (productDiscount));
      if(coupon){
      orderedAmount = coupon
      }
      
      productsWithMRP.push({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || 'N/A',
        discount: productDiscount.toFixed(2),
        totalAmount:orderedAmount,
        MRP: itemMRP, 
        status: "Pending",
        coupon: couponDiscount ? couponDiscount.toFixed(2) : 0,
        image: item.productId.images && item.productId.images[0]
          ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${item.productId.images[0]}`
          : '',
      });
    }
    
    

    const order = new Order({
      user: user._id,
      paymentMethod: 'Card',
      products: productsWithMRP,
      totalAmount: orderedAmount,
      paymentStatus: 'Pending',
      orderId: '#ORD' + Date.now(),
      address: selectedAddress,
      Status: 'Pending',
      paymentId: '',
      razorPayId: '',
      totalDiscount: discount.toFixed(2),
      coupon: couponDiscount ? couponDiscount.toFixed(2) : 0
    });

    for (const item of cart.products) {
      const product = item.productId;
      const size = item.size;
      product.sizes[size].quantity -= item.quantity;
      await product.save();
    }

    req.session.defaultAddressId = null;
    await order.save();

    res.render('users/checkoutFailure', { user: req.session.user, cart, defaultAddressId, totalPrice, order });
  } catch (error) {
    console.error('Checkout failure error:', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const retryPayment = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const userId = req.session.user._id;

        const order = await Order.findOne({
            _id: orderId,
            user: userId,
            paymentStatus: 'Pending',
        });

        if (!order) return res.status(404).json({ error: 'Order not found or already paid' });

        const options = {
            amount: Math.round(order.totalAmount * 100),
            currency: 'INR',
            receipt: `retry_receipt_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                defaultAddress: order.address._id.toString(),
                totalPrice: order.totalAmount.toString(),
                retryOrderId: order._id.toString(),
            },
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.status(200).json({
            order_id: razorpayOrder.id,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: req.session.user.name,
            email: req.session.user.email,
            contact: req.session.user.mobile || '9123456780',
        });
    } catch (error) {
        console.error('Retry Payment Error:', error);
        res.status(500).json({ error: 'Retry payment failed' });
    }
};


module.exports = {
                    myOrder,
                    orderPlaced,
                    placeOrder,
                    cancelOrder,
                    bulkCancel,
                    orderdetails,
                    returnProduct,
                    createRazorpayOrder,
                    handlePaymentSuccess,
                    handleCheckoutFailure,
                    invoice,
                    retryPayment
                    

                }