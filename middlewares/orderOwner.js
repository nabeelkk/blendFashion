const Order = require('../modal/orderModal')
async function checkOrderOwnership(req, res, next) {
  try {
    const orderId = req.params.id || req.body.orderId || req.params.orderId;
    if (!orderId) {
      if (req.accepts('html')) {
        return res.redirect('/myOrder?error=Order ID is required');
      }
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      if (req.accepts('html')) {
        return res.redirect('/myOrder?error=Order not found');
      }
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    // Check if the order belongs to the authenticated user
    if (order.user.toString() !== req.session.user.id) {
      if (req.accepts('html')) {
        return res.redirect('/myOrder?error=You do not have permission to view this order');
      }
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this order' });
    }
    req.order = order; // Pass the order to the next handler
    next();
  } catch (error) {
    console.error(error);
    if (req.accepts('html')) {
      return res.redirect('/myOrder?error=Server error');
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = checkOrderOwnership;