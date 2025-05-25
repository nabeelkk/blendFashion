const Coupon = require("../modal/coupenModel")
const User = require('../modal/userModal')

const displayCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.find({})
        console.log(coupon);
        res.render('admin/couponList', { coupon })
    } catch (error) {
        console.log(error.message);
    }
}

const displayAddCoupon = async (req, res) => {
    try {
        res.render('admin/addCoupon')
    } catch (error) {
        console.log(error.message);
    }
}

const addCoupon = async (req, res) => {
    try {
        const { name, discount, expirydate, minpurchase } = req.body
        const coupon = new Coupon({
            name: name,
            discount: discount,
            expiryDate: expirydate,
            minPurchase: minpurchase,
            couponcode: undefined
        })
        await coupon.save();
        res.redirect("/admin/couponList")
    } catch (error) {
        console.log(error.message);
    }
}

const getEditCoupon = async (req, res) => {
    try {
        const couponID = req.query.id
        req.session.cid = couponID
        const coupon = await Coupon.findById({ _id: couponID })
        res.render('admin/editCoupon', { coupon })
    } catch (error) {
        console.log(error.message);
    }
}

const postEditCoupon = async (req, res) => {
    try {
        const couponID = req.session.cid
        const { name, discount, maxdiscount, expirydate, minpurchase } = req.body
        const coupon = await Coupon.findByIdAndUpdate({ _id: couponID },
            {
                $set: {
                    name: name,
                    discount: discount,
                    maxdiscount: maxdiscount,
                    minPurchase: minpurchase,
                    expiryDate: expirydate
                }
            })
        res.redirect('/admin/couponList')
    } catch (error) {
        console.log(error.message);
    }
}

const blockCoupon = async (req, res) => {
    try {
        const couponID = req.query.id
        const coupon = await Coupon.findById({ _id: couponID })
        if (coupon.isActive == true) {
            await Coupon.findOneAndUpdate({ _id: couponID }, { $set: { isActive: false } })
        } else {
            await Coupon.findOneAndUpdate({ _id: couponID }, { $set: { isActive: true } })
        }
        res.redirect('/admin/couponList')
    } catch (error) {
        console.log(error.message);
    }
}

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalprice } = req.body;
    console.log(req.body,"body")
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
    await user.save();

    await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { user: user._id } });

    res.json({
      success: true,
      discount: discountAmount,
      discountedTotal,
      message: `Coupon applied. You saved ${discountAmount}!`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
const removeCoupon = async (req, res) => {
//   try {
//     const user = req.session.user;
//     user.discountedTotal = null;
//     await user.save();
//     res.json({ success: true, message: 'Coupon removed.' });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server Error');
//   }
};

module.exports = {
    displayCoupon,
    displayAddCoupon,
    addCoupon,
    getEditCoupon,
    postEditCoupon,
    blockCoupon,
    applyCoupon,
    removeCoupon
}