const Order = require('../modal/orderModal');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');

const generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, filterType } = req.body;

    let query = { paymentStatus: 'completed' };
    const now = moment();

    if (filterType === 'daily') {
      query.createdAt = {
        $gte: now.startOf('day').toDate(),
        $lte: now.endOf('day').toDate(),
      };
    } else if (filterType === 'weekly') {
      query.createdAt = {
        $gte: now.startOf('week').toDate(),
        $lte: now.endOf('week').toDate(),
      };
    } else if (filterType === 'monthly') {
      query.createdAt = {
        $gte: now.startOf('month').toDate(),
        $lte: now.endOf('month').toDate(),
      };
    } else if (filterType === 'yearly') {
      query.createdAt = {
        $gte: now.startOf('year').toDate(),
        $lte: now.endOf('year').toDate(),
      };
    } else if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(query).populate('products.productId');
    let totalSales = 0;
    let totalDiscount = 0;
    let totalOrders = orders.length;
    let couponDeduction = 0;

    orders.forEach(order => {
      totalSales += order.totalAmount;
      totalDiscount += order.totalDiscount || 0;
      if (order.appliedCoupon) {
        couponDeduction += order.totalDiscount || 0; 
      }
    });

    const report = {
      totalSales,
      totalDiscount,
      couponDeduction,
      totalOrders,
      orders,
    };

    res.json(report);
  } catch (error) {
    console.error('Generate Sales Report Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, filterType, format } = req.body;

    let query = { paymentStatus: 'completed' };
    const now = moment();

    if (filterType === 'daily') {
      query.createdAt = {
        $gte: now.startOf('day').toDate(),
        $lte: now.endOf('day').toDate(),
      };
    } else if (filterType === 'weekly') {
      query.createdAt = {
        $gte: now.startOf('week').toDate(),
        $lte: now.endOf('week').toDate(),
      };
    } else if (filterType === 'monthly') {
      query.createdAt = {
        $gte: now.startOf('month').toDate(),
        $lte: now.endOf('month').toDate(),
      };
    } else if (filterType === 'yearly') {
      query.createdAt = {
        $gte: now.startOf('year').toDate(),
        $lte: now.endOf('year').toDate(),
      };
    } else if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(query).populate('products.productId');
    let totalSales = 0;
    let totalDiscount = 0;
    let totalOrders = orders.length;
    let couponDeduction = 0;

    orders.forEach(order => {
      totalSales += order.totalAmount;
      totalDiscount += order.totalDiscount || 0;
      if (order.appliedCoupon) {
        couponDeduction += order.totalDiscount || 0;
      }
    });

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

      doc.pipe(res);
      doc.fontSize(20).text('Sales Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${filterType || 'Custom'}`);
      doc.text(`Date Range: ${moment(query.createdAt.$gte).format('YYYY-MM-DD')} to ${moment(query.createdAt.$lte).format('YYYY-MM-DD')}`);
      doc.moveDown();

      doc.text(`Total Orders: ${totalOrders}`);
      doc.text(`Total Sales: ₹${totalSales.toFixed(2)}`);
      doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`);
      doc.text(`Coupon Deduction: ₹${couponDeduction.toFixed(2)}`);
      doc.moveDown();

      orders.forEach((order, index) => {
        doc.text(`Order ${index + 1}:`);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Total Amount: ₹${order.totalAmount}`);
        doc.text(`Discount: ₹${order.totalDiscount || 0}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.moveDown();
      });

      doc.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Date', key: 'createdAt', width: 15 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Discount', key: 'totalDiscount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      ];

      orders.forEach(order => {
        worksheet.addRow({
          orderId: order.orderId,
          createdAt: moment(order.createdAt).format('YYYY-MM-DD'),
          totalAmount: order.totalAmount,
          totalDiscount: order.totalDiscount || 0,
          paymentMethod: order.paymentMethod,
        });
      });

      worksheet.addRow({});
      worksheet.addRow({
        orderId: 'Total',
        totalAmount: totalSales,
        totalDiscount: totalDiscount,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Download Sales Report Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { generateSalesReport, downloadSalesReport };