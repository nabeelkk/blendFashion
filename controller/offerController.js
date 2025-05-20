const Category = require('../modal/category')
const Product = require('../modal/productModal')


const categoryOffer = async(req,res)=>{
    try {
        const category = await Category.find({isListed:true , offer:{$exists:true,$ne: {}}})
        res.render('admin/offer',{category})
    } catch (error) {
        console.log(error.message);
    }
}
const getAddCategory = async(req,res)=>{
    try {
        const category = await Category.find({isListed:true})
        res.render('admin/addcategoryoffer',{category})
    } catch (error) {
        console.log(error.message);
    }
}
const postCategoryOffer = async(req,res)=>{
    try {
        const {name,discount,startdate,enddate} = req.body
        console.log(req.body);
        const category = await Category.findOne({name:name})
        console.log(category);
        const offerdata = {
            discount:discount,
            startDate:startdate,
            endDate:enddate
        }
            await Category.findByIdAndUpdate({_id:category._id},{
            $set:{
                offer:offerdata
            }
        })
        res.redirect("/admin/categoryOffer")
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    res.render("admin/editCategoryoffer", { category });
  } catch (error) {
    console.log("Load edit category offer error:", error.message);
  }
};

const updateCategoryOffer = async (req, res) => {
  try {
    const { discount, startdate, enddate } = req.body;
    const categoryId = req.params.id;

    const offerdata = {
      discount,
      startDate: startdate,
      endDate: enddate
    };

    await Category.findByIdAndUpdate(
      categoryId,
      { $set: { offer: offerdata } }
    );
    return res.json({success:true,message:"Edited"})
  } catch (error) {
    console.log("Update category offer error:", error.message);
  }
};

const deleteCetegoryOffer = async(req,res)=>{
    try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);

    if (!category || !category.offer) {
      return res.status(404).json({ success: false, message: "Category or offer not found" });
    }

    const currentStatus = category.offer.isActive;
    await Category.findByIdAndUpdate(categoryId, {
      $set: { "offer.isActive": !currentStatus }
    });

    const message = currentStatus
      ? "Offer deactivated successfully"
      : "Offer activated successfully";

    res.json({ success: true, message });
  } catch (error) {
    console.log("delete category offer side", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const productOffer = async(req,res)=>{
    try {
        const product = await Product.find({isdeleted:false , offer:{$exists:true,$ne: {}}})
        res.render('admin/productOffer',{product})
    } catch (error) {
        console.log(error.message);
    }
}

const getAddProduct = async(req,res)=>{
    try {
        const product = await Product.find({isdeleted:false})
        res.render('admin/addproductoffer',{product})
    } catch (error) {
        console.log(error.message);
    }
}

const postProductOffer = async(req,res)=>{
    try {
        const {name,discount,startdate,enddate} = req.body
        console.log(req.body);
        const product = await Product.findOne({name:name})
        const offerdata = {
            discount:discount,
            startDate:startdate,
            endDate:enddate
        }
            await Product.findByIdAndUpdate({_id:product._id},{
            $set:{
                offer:offerdata
            }
        })
        res.redirect("/admin/productOffer")
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditProductOffer = async(req,res)=>{
    try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("admin/editProductoffer", { product });
  } catch (error) {
    console.log("Load edit product offer error:", error.message);
  }
}

const updateProductOffer = async(req,res)=>{
    try {
    const { discount, startdate, enddate } = req.body;
    const productId = req.params.id;

    const offerdata = {
      discount,
      startDate: startdate,
      endDate: enddate
    };

    await Product.findByIdAndUpdate(
      productId,
      { $set: { offer: offerdata } }
    );
    return res.json({success:true,message:"Edited"})
  } catch (error) {
    console.log("Update product offer error:", error.message);
  }
}

const deleteProductOffer = async(req,res)=>{
    try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product || !product.offer) {
      return res.status(404).json({ success: false, message: "product or offer not found" });
    }

    const currentStatus = product.offer.isActive;
    await Product.findByIdAndUpdate(productId, {
      $set: { "offer.isActive": !currentStatus }
    });

    const message = currentStatus
      ? "Offer deactivated successfully"
      : "Offer activated successfully";

    res.json({ success: true, message });
  } catch (error) {
    console.log("delete product offer side", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
    categoryOffer,
    getAddCategory,
    postCategoryOffer,
    deleteCetegoryOffer,
    loadEditCategoryOffer,
    updateCategoryOffer,
    productOffer,
    getAddProduct,
    postProductOffer,
    deleteProductOffer,
    loadEditProductOffer,
    updateProductOffer
}