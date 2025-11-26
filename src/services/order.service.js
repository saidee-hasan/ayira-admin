const OrderModel = require('../models/order.model');
const EmailService = require('../utils/email');
const { ObjectId } = require('mongodb');

class OrderService {
  static async createOrder(orderData) {
    const order = await OrderModel.create(orderData);
    
    // Send email notifications
    try {
      await EmailService.sendOrderEmails({
        userName: orderData.name,
        userEmail: orderData.email,
        orderInfo: {
          styleNumber: orderData.products?.[0]?.styleNumber || 'N/A',
          company: orderData.company || 'N/A'
        }
      });
    } catch (emailError) {
      console.error('Failed to send order emails:', emailError);
    }

    return order;
  }

  static async getOrderById(orderId) {
    return await OrderModel.findById(new ObjectId(orderId));
  }

  static async getOrdersByEmail(email, options = {}) {
    return await OrderModel.findByEmail(email, options);
  }

  static async getAllOrders(filters = {}, options = {}) {
    return await OrderModel.find(filters, options);
  }

  static async updateOrderStatus(orderId, status) {
    return await OrderModel.updateStatus(new ObjectId(orderId), status);
  }

  static async deleteOrder(orderId) {
    return await OrderModel.deleteById(new ObjectId(orderId));
  }

  static async getOrderStats() {
    return await OrderModel.getOrderStats();
  }

  static async getRecentOrders(limit = 10) {
    return await OrderModel.find({}, { 
      limit, 
      sort: { createdAt: -1 } 
    });
  }
}

module.exports = OrderService;