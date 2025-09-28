const crypto = require("crypto");
const Order = require("../models/orderModel");
const { menuHelpers } = require("../data/menuItems");

//Check payment status
exports.checkPaymentStatus = async (req, res, next) => {
  const { reference, sessionId } = req.body;
  if (!reference || !sessionId) {
    return res.json({
      success: false,
      response: "Reference and session ID are required",
    });
  }

  const order = await Order.findOne({ paymentReference: reference, sessionId });
  if (!order) {
    return res.json({
      success: false,
      response:
        "Order not found. Please try again or check order history (98).",
    });
  }

  let responseText;
  if (order.status === "paid") {
    responseText =
      `✅ Payment confirmed for Order ${order.orderNumber}!\n\n` +
      `Total: ₦${order.totalAmount.toLocaleString()}\n\n` +
      `What would you like to do next?\n\n` +
      menuHelpers.formatMainMenu();
  } else if (order.status === "cancelled") {
    responseText =
      `❌ Payment cancelled for Order ${order.orderNumber}. Type 99 to try again.\n\n` +
      `What would you like to do next?\n\n` +
      menuHelpers.formatMainMenu();
  } else {
    responseText =
      `⏳ Payment pending for Order ${order.orderNumber}. Please check again soon or type 98 for order history.\n\n` +
      `What would you like to do next?\n\n` +
      menuHelpers.formatMainMenu();
  }

  res.json({
    success: true,
    response: responseText,
    status: order.status,
  });
};

// Webhook handler for Paystack
exports.handlePaystackWebhook = async (req, res, next) => {

  //Verify the webhook signature
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid Paystack webhook signature" });
  }

  //Process the event
  const { event, data } = req.body;
  console.log("Webhook event received:", event, data);

  if (event === "charge.success") {
    const { reference, amount, metadata } = data;
    console.log("metadata", metadata);
    const { orderId, orderNumber } = metadata;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found for reference:", reference);
      return res.status(200).json({ status: "success" });
    }

    // Verify amount
    if (order.totalAmount * 100 !== amount) {
      console.log("Amount mismatch:", {
        orderAmount: order.totalAmount * 100,
        paystackAmount: amount,
      });
      return res.status(200).json({ status: "success" });
    }

    // Update order status
    order.status = "paid";
    order.paymentStatus = "success";
    order.paymentReference = reference;
    await order.save();

    console.log(
      `Order ${orderNumber} marked as paid for reference: ${reference}`
    );
  } else if (event === "charge.failed") {
    const { reference, metadata } = data;
    const { orderId, orderNumber } = metadata;

    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found for reference:", reference);
      return res.status(200).json({ status: "success" });
    }

    order.status = "cancelled";
    order.paymentStatus = "failed";
    order.paymentReference = reference;
    await order.save();

    console.log(
      `Order ${orderNumber} marked as cancelled for reference: ${reference}`
    );
  }

  // 3. Acknowledge the webhook
  res.status(200).json({ status: "success" });
};
