const Offer = require('../modal/offerModal');
const Product = require('../modal/productModal');

const applyBestOffer = async (productId) => {
  const product = await Product.findById(productId).populate('category');
  if (!product) return { offerPrice: null, offerExpiry: null };

  const now = new Date();
  let bestDiscount = 0;
  let offerPrice = product.price.seller;
  let offerExpiry = null;

  // Check product offer
  const productOffer = await Offer.findOne({
    type: 'product',
    productId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (productOffer) {
    bestDiscount = productOffer.discount;
    offerPrice = product.price.seller * (1 - productOffer.discount / 100);
    offerExpiry = productOffer.endDate;
  }

  // Check category offer
  const categoryOffer = await Offer.findOne({
    type: 'category',
    categoryId: product.category,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (categoryOffer && categoryOffer.discount > bestDiscount) {
    bestDiscount = categoryOffer.discount;
    offerPrice = product.price.seller * (1 - categoryOffer.discount / 100);
    offerExpiry = categoryOffer.endDate;
  }

  return { offerPrice: offerPrice.toFixed(2), offerExpiry };
};

const updateProductOffers = async () => {
  const products = await Product.find({ isListed: true });
  for (const product of products) {
    const { offerPrice, offerExpiry } = await applyBestOffer(product._id);
    product.offerPrice = offerPrice;
    product.offerExpiry = offerExpiry;
    await product.save();
  }
};

module.exports = { applyBestOffer, updateProductOffers };