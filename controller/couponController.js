const Coupon = require("../modal/coupenModel")
const User = require('../modal/userModal')

const displayCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.find({})

        res.render('admin/couponList', { coupon})
    } catch (error) {
        console.log(error.message);
    }
}

const displayAddCoupon = async (req, res) => {
    try {
        const error = req.query.error
        const discounterror = req.query.discounterror
        const minPurchaseerror = req.query.minPurchaseerror
        const nameError = req.query.nameError
        res.render('admin/addCoupon',{error,minPurchaseerror,discounterror,nameError})
    } catch (error) {
        console.log(error.message);
    }
}

const addCoupon = async (req, res) => {
    try {
        const { name, discount, expirydate, minpurchase } = req.body
        if(!name||!discount||!expirydate||!minpurchase){
            return res.json({success:false,message:"All field are required"})
        }
        const existCouponName = await Coupon.findOne({name})
        if(existCouponName){
            return res.json({success:false,message:"Name already exist"})
        }
        const coupon = new Coupon({
            name: name,
            discount: discount,
            expiryDate: expirydate,
            minPurchase: minpurchase,
            couponcode: undefined
        })
        await coupon.save();
        return res.json({success:true,message:"Coupon successfully added"})
    } catch (error) {
        console.log(error.message);
    }
}

const getEditCoupon = async (req, res) => {
    try {
        const couponID = req.query.id
        req.session.cid = couponID
        const error = req.query.error
        const discounterror = req.query.discounterror
        const minPurchaseerror = req.query.minPurchaseerror
        const nameError = req.query.nameError

        const coupon = await Coupon.findById(couponID)
        res.render('admin/editCoupon', { coupon,error,discounterror,minPurchaseerror,nameError  })
    } catch (error) {
        console.log("get coupon edit side",error);
    }
}

const postEditCoupon = async (req, res) => {
    try {
        const couponID = req.session.cid
        const { name, discount, expirydate, minpurchase } = req.body
        if(!name|| !discount || !expirydate || !minpurchase){
            return res.json({success:false,message:"All field are required"})
        }
        const coupon = await Coupon.findByIdAndUpdate({ _id: couponID },
            {
                $set: {
                    name: name,
                    discount: discount,
                    minPurchase: minpurchase,
                    expiryDate: expirydate
                }
            })
        return res.json({success:true,message:"Coupon successfully edited"})
    } catch (error) {
        console.log("coupon edit side",error);
    }
}

const blockCoupon = async (req, res) => {
    try {
        const couponID = req.query.id
        const coupon = await Coupon.findById({ _id: couponID })
        if (coupon.isActive == true) {
            await Coupon.findOneAndUpdate({ _id: couponID }, { $set: { isActive: false } })
            return res.json({success:true,message:"Coupon Blocked"})
        } else {
            await Coupon.findOneAndUpdate({ _id: couponID }, { $set: { isActive: true } })
            return res.json({success:true,message:"Coupon Unblocked"})
        }
    } catch (error) {
        console.log(error.message);
    }
}

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalprice } = req.body;
    const userId = req.session.user._id;
    const user = await User.findById({_id:userId})

    const coupon = await Coupon.findOne({ couponcode: couponCode, isActive: true });
    if (!coupon) {
      return res.json({ success: false, message: 'Invalid or inactive coupon code.' });
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      return res.json({ success: false, message: 'Coupon has expired.' });
    }

    if (coupon.user.includes(user._id)) {
      return res.json({ success: false, message: 'Coupon already used.' });
    }

    if (totalprice < coupon.minPurchase) {
      return res.json({ success: false, message: `Minimum purchase of ${coupon.minPurchase} required.` });
    }

    const discountAmount = (coupon.discount / 100) * totalprice;
    const discountedTotal = totalprice - discountAmount;
    req.session.user.discountAmount = discountAmount
    req.session.user.discountedTotal = discountedTotal;
    req.session.user.coupon = coupon.couponcode
    await user.save();

    await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { user: user._id } });

    res.json({
      success: true,
      discount: discountAmount,
      discountedTotal,
      coupon:coupon,
      message: `Coupon applied. You saved ${discountAmount}!`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
const removeCoupon = async (req, res) => {
  try {
    const userSession = req.session.user;
    const user = await User.findById(userSession._id);  
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const couponCode = req.session.user.coupon;
    const coupon = await Coupon.findOne({ couponcode: couponCode });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    await Coupon.findByIdAndUpdate(coupon._id, { $pull: { user: user._id } });

    user.discountedTotal = null;
    await user.save();

    req.session.user.discountedTotal = null;
    req.session.user.discountAmount = null;
    req.session.user.coupon = null;

    res.json({ success: true, message: 'Coupon removed.' });
  } catch (error) {
    console.error("remove coupon", error);
    res.status(500).send('Server Error');
  }
};

const deleteCoupon = async (req,res)=>{
    try {
        const couponId = req.params.id
        if(!couponId){
            return res.json({success:false,message:"Coupon not found"})
        }
        await Coupon.findByIdAndDelete({_id:couponId})
        return res.json({success:true,message:"Coupon deleted succesfully"})
    } catch (error) {
        console.log('coupon delete side',error)
    }
}

module.exports = {
    displayCoupon,
    displayAddCoupon,
    addCoupon,
    getEditCoupon,
    postEditCoupon,
    blockCoupon,
    applyCoupon,
    removeCoupon,
    deleteCoupon
}