const Wishlist = require('../modal/whishListModel');
const Product = require('../modal/productModal');
const User = require('../modal/userModal');
const Cart = require('../modal/cartModal')


const wishList = async(req,res)=>{
    const user = req.session.user
    if(!user){
        return res.redirect('/login')
    }
    const userId= req.session.user._id
    const cart = await Cart.find({userId:userId})
    let cartCount
    cart.forEach((elem)=>cartCount = elem.products.length)
    let wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
    const cloudName = process.env.CLOUDINARY_NAME 

    res.render('users/wishlist',{user,wishlist,cloudName,cartCount})
}
const addwishList = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const productId = req.params.id

        let wishList = await Wishlist.findOne({userId});

        if(!wishList){
            wishList = new Wishlist({userId,product:[]});
        }
        const alreadyExist = wishList.products.some((prod)=>prod.productId.equals(productId));
        if(alreadyExist){
            return res.json({sucess:false,message:"Item already in wishlist"});
        }
        wishList.products.push({productId});
        await wishList.save()

        res.json({success:true,message:"Added to wishlist"})
    } catch (error) {
        console.log('add whislist side',error);
        return res.status(500).send("Internal error")
    }
}

const removewishList = async(req,res)=>{
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId

        const wishList = await Wishlist.findOne({userId})
        if(!wishList){
            return res.json({success:false,message:"Wish Not Found"})
        }
        wishList.products = wishList.products.filter((prod)=> {return !(prod.productId.equals(productId))})

        await wishList.save()
        return res.json({success:true,message:"Item deleted Successfully"})
    } catch (error) {
        console.log("wish list delete side",error);
        return res.status(500).send("internal error")
    }

}



module.exports = {wishList,addwishList,removewishList,}