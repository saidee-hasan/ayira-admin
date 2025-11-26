const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

class EmailService {
  static async sendOrderEmails(orderData) {
    const { userName, userEmail, orderInfo } = orderData;
    const adminEmail = process.env.ADMIN_EMAIL_RECEIVER;

    const adminMailOptions = {
      from: `Aaryan Sourcing Order <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `New Order Alert! - Style: ${orderInfo.styleNumber}`,
      html: `
        <h1>New Order Received</h1>
        <p>A new order has been placed on your website.</p>
        <hr>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Customer Name:</strong> ${userName}</li>
          <li><strong>Customer Email:</strong> ${userEmail}</li>
          <li><strong>Style Number:</strong> ${orderInfo.styleNumber}</li>
          <li><strong>Company:</strong> ${orderInfo.company}</li>
        </ul>
        <p>Please log in to the admin dashboard for full details.</p>
      `,
    };

    const userMailOptions = {
      from: `Aaryan Sourcing <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `Your Order is Confirmed (Style: ${orderInfo.styleNumber})`,
      html: `
        <h1>Thank you for your order, ${userName}!</h1>
        <p>We have successfully received your order. Our team will review it and get back to you soon.</p>
        <hr>
        <h3>Your Order Summary:</h3>
        <ul>
          <li><strong>Style Number:</strong> ${orderInfo.styleNumber}</li>
        </ul>
        <p>If you have any questions, feel free to contact us.</p>
        <br>
        <p>Best Regards,</p>
        <p><strong>Aaryan Sourcing Ltd.</strong></p>
      `,
    };

    try {
      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions),
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send emails');
    }
  }

  static async sendNewsletter(email, subject, content) {
    const mailOptions = {
      from: `Aaryan Sourcing <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: content,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Newsletter email error:', error);
      throw new Error('Failed to send newsletter');
    }
  }
}

module.exports = EmailService;