const Coupon = require("../modal/coupenModel")

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
        const user = req.session.user
        const { couponCode, totalprice } = req.body
        const coupon = await Coupon.findOne({couponcode:couponCode,isActive:true})
        console.log(coupon,"coupon")    
        if (coupon) {
            let expiryDate = new Date(coupon.expiryDate)
            let currentDate = new Date()
            console.log(expiryDate,"expr date")
            console.log(currentDate,"todays date")
            console.log(currentDate <= expiryDate)
            if (currentDate <= expiryDate) {
                if (!coupon.user.includes(user)) {
                    if (parseInt(totalprice) >= coupon.minPurchase) {
                        const randomDiscount = coupon.discount;
                        const discountAmount = randomDiscount;
                        const discountedTotal = Math.floor(parseInt(totalprice) - discountAmount);
                        user.discounted = discountedTotal;
                        await Coupon.findOneAndUpdate(
                            { couponcode: couponCode },
                            { $addToSet: { user: user } }
                        );
                        res.json({
                            success: true, discount: randomDiscount,
                            discounted: discountedTotal,message:`Coupon Added. You are saved ${discountedTotal} !!`
                        })
                    } else {
                        res.json({ success: false, message: 'Order amount does not meet the minimum purchase requirement for this coupon.' })
                    }
                } else {
                    res.json({ success: false, message: "You have already used this coupon code" })
                }
            } else {
                res.json({ success: false, message: 'The coupen has been expired' })
            }
        } else {
            res.json({ success: false, message: "Invalid coupon code or the coupon is inactive." })
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    displayCoupon,
    displayAddCoupon,
    addCoupon,
    getEditCoupon,
    postEditCoupon,
    blockCoupon,
    applyCoupon
}