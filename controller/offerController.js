const Category = require('../modal/category');
const Offer = require('../modal/offerModal');

const categoryOffer = async (req, res) => {
    try {
        const offers = await Offer.find({ isDeleted: false }).populate('category');
        res.render('admin/offer', { offers });
    } catch (error) {
        console.error('Error loading offers:', error.message);
        res.status(500).render('admin/offer', { offers: [], error: 'Failed to load offers' });
    }
};

const getAddCategory = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        const error = req.query.error || null;
        res.render('admin/addcategoryoffer', { categories, error });
    } catch (error) {
        console.error('Error loading add category offer page:', error.message);
        res.status(500).render('admin/addcategoryoffer', { categories: [], error: 'Failed to load categories' });
    }
};

const postCategoryOffer = async (req, res) => {
    try {
        const { category, discount, startDate, endDate } = req.body;

        if (!category || !discount || !startDate || !endDate) {
            return res.redirect('/admin/getaddcategory?error=All fields are required');
        }

        if (isNaN(discount) || discount < 0 || discount > 99) {
            return res.redirect('/admin/getaddcategory?error=Discount must be between 0 and 100');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return res.redirect('/admin/getaddcategory?error=Start date must be before end date');
        }

        const existingOffer = await Offer.findOne({ category, isActive: true, isDeleted: false });
        if (existingOffer) {
            return res.redirect('/admin/getaddcategory?error=Selected category already has an active offer');
        }

        const offerData = new Offer({
            type: 'category',
            category,
            discount,
            startDate: start,
            endDate: end,
            isActive: true,
            isDeleted: false
        });

        await offerData.save();
        res.redirect('/admin/categoryOffer');
    } catch (error) {
        console.error('Error creating category offer:', error.message);
        res.redirect('/admin/getaddcategory?error=Failed to create offer');
    }
};

const loadEditCategoryOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId).populate('category');
        if (!offer) {
            return res.status(404).render('admin/editCategoryoffer', { offer: null, error: 'Offer not found' });
        }
        const categories = await Category.find({ isListed: true });
        res.render('admin/editCategoryoffer', { offer, categories, error: null });
    } catch (error) {
        console.error('Error loading edit category offer:', error.message);
        res.status(500).render('admin/editCategoryoffer', { offer: null, categories: [], error: 'Failed to load offer' });
    }
};

const updateCategoryOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const { category, discount, startDate, endDate } = req.body;
    console.log(req.body)
    if (!category || !discount || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({ success: false, message: 'Discount must be between 0 and 100' });
    }
console.log("hhhl")
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date' });
    }
console.log("hhhla")
    const selectedCategory = await Category.findOne({ name: category });
    console.log(selectedCategory,'selected one')
    if (!selectedCategory) {
      return res.status(400).json({ success: false, message: 'Category not found' });
    }
console.log("hhhlas")
    const existingOffer = await Offer.findOne({
      category: selectedCategory._id,
      isActive: true,
      isDeleted: false,
      _id: { $ne: offerId }
    });
    if (existingOffer) {
      return res.status(400).json({ success: false, message: 'Selected category already has an active offer' });
    }
console.log("hhhlast")
    await Offer.findByIdAndUpdate(offerId, {
      $set: {
        category: selectedCategory._id,
        discount,
        startDate: start,
        endDate: end,
        updatedAt: new Date()
      }
    });
console.log("hhhlast aanu")
    res.json({ success: true, message: 'Offer updated successfully' });
  } catch (error) {
    console.error('Error updating category offer:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update offer' });
  }
};


const blockCategoryOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);
        console.log(offerId)
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        const currentStatus = offer.isActive;
        await Offer.findByIdAndUpdate(offerId, {
            $set: { isActive: !currentStatus }
        });

        const message = currentStatus ? 'Offer deactivated successfully' : 'Offer activated successfully';
        res.json({ success: true, message });
    } catch (error) {
        console.error('Error toggling offer status:', error.message);
        res.status(500).json({ success: false, message: 'Failed to toggle offer status' });
    }
};

const deleteCategoryOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        await Offer.findByIdAndUpdate(offerId, {
            $set: { isDeleted: true, isActive: false }
        });

        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete offer' });
    }
};

module.exports = {
    categoryOffer,
    getAddCategory,
    postCategoryOffer,
    blockCategoryOffer,
    loadEditCategoryOffer,
    updateCategoryOffer,
    deleteCategoryOffer
};