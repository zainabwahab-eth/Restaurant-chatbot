const dotenv = require("dotenv");
const axios = require("axios");
const Session = require("../models/sessionModel");
const Order = require("../models/orderModel");
const { menuHelpers } = require("../data/menuItems");

dotenv.config({ path: "./config.env" });

// Initialize chat session
async function initializeChat(req, res) {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.json({
        success: false,
        response: "Session ID is required",
      });
    }

    // Extract device ID from session ID (simple approach)
    const deviceId = sessionId;

    // Find or create session
    const session = await Session.findOrCreate(sessionId, deviceId);

    // Send welcome message with main menu
    const welcomeMessage = menuHelpers.formatMainMenu();

    res.json({
      success: true,
      response: welcomeMessage,
    });
  } catch (error) {
    console.error("Initialize chat error:", error);
    res.json({
      success: false,
      response: "Sorry, something went wrong. Please try again.",
    });
  }
}

// Handle chat messages
async function handleChatMessage(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.json({
        success: false,
        response: "Message and session ID are required",
      });
    }

    const deviceId = sessionId;
    const userInput = message.trim();

    // Find or create session
    const session = await Session.findOrCreate(sessionId, deviceId);

    // Process the message based on current step
    const response = await processUserInput(session, userInput);

    if (typeof response === "object" && response.text && response.paymentData) {
      res.json({
        success: true,
        response: response.text, // Send text as response
        paymentData: response.paymentData, // Include paymentData separately
      });
    } else {
      res.json({
        success: true,
        response: response, // Handle string responses
      });
    }
  } catch (error) {
    console.error("Handle chat message error:", error);
    res.json({
      success: false,
      response: "Sorry, something went wrong. Please try again.",
    });
  }
}

// Main function to process user input
async function processUserInput(session, userInput) {
  const input = userInput.toLowerCase();

  if (session.currentStep === "awaiting_email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      return `❌ *Invalid Email*\nPlease enter a valid email address:`;
    }
    session.customerEmail = input;
    session.currentStep = "main_menu"; // Reset to main_menu
    await session.save();
    return await handleCheckout(session);
  }

  if (input.startsWith("ref_")) {
    return await handlePaymentVerification(session, input);
  }

  // Handle global commands first
  if (input === "0") {
    return await handleCancelOrder(session);
  }

  if (input === "97") {
    return await handleCurrentOrder(session);
  }

  if (input === "98") {
    return await handleOrderHistory(session);
  }

  if (input === "99") {
    return await handleCheckout(session);
  }

  if (input === "back" || input === "menu") {
    return await handleBackToMainMenu(session);
  }

  // Process based on current step
  switch (session.currentStep) {
    case "main_menu":
      return await handleMainMenu(session, userInput);

    case "browsing_menu":
      return await handleMenuBrowsing(session, userInput);

    case "selecting_item":
      return await handleItemSelection(session, userInput);

    case "quantity":
      return await handleQuantitySelection(session, userInput);

    default:
      return await handleBackToMainMenu(session);
  }
}

// Handle main menu selection
async function handleMainMenu(session, userInput) {
  const input = parseInt(userInput);
  const categories = menuHelpers.getCategories();

  if (isNaN(input) || input < 1 || input > categories.length) {
    return (
      `Please select a valid option (1-${categories.length}, 0, 97, 98, or 99):\n\n` +
      menuHelpers.formatMainMenu()
    );
  }

  const selectedCategory = categories[input - 1];
  session.currentCategory = selectedCategory.id;
  session.currentStep = "browsing_menu";
  await session.save();

  return menuHelpers.formatCategoryMenu(selectedCategory.id);
}

// Handle menu browsing (selecting items from category)
async function handleMenuBrowsing(session, userInput) {
  const input = parseInt(userInput);
  const categoryItems = menuHelpers.getCategoryItems(session.currentCategory);

  if (!categoryItems) {
    return await handleBackToMainMenu(session);
  }

  if (isNaN(input) || input < 1 || input > categoryItems.length) {
    return (
      `Please select a valid item number (1-${categoryItems.length}) or type 'back':\n\n` +
      menuHelpers.formatCategoryMenu(session.currentCategory)
    );
  }

  const selectedItem = menuHelpers.findItemBySelection(
    session.currentCategory,
    input
  );
  session.selectedItem = selectedItem;
  session.currentStep = "selecting_item";
  await session.save();

  return (
    `✅ *${selectedItem.name}* - ${selectedItem.formattedPrice}\n\n` +
    `${selectedItem.description}\n\n` +
    `How many would you like to add to your order?\n` +
    `Enter quantity (1-10) or type 'back' to choose another item.`
  );
}

// Handle item selection (adding to cart)
async function handleItemSelection(session, userInput) {
  const input = parseInt(userInput);

  if (isNaN(input) || input < 1 || input > 10) {
    return `Please enter a valid quantity (1-10) or type 'back':`;
  }

  const quantity = input;
  const item = session.selectedItem;

  // Add item to order
  const orderItem = {
    itemId: item.id,
    name: item.name,
    price: item.price,
    quantity: quantity,
    category: item.category,
  };

  const order = await Order.addItemToOrder(
    session.sessionId,
    session.deviceId,
    orderItem
  );

  // Reset session state
  session.currentStep = "main_menu";
  session.selectedItem = null;
  await session.save();

  const totalAmount = order.totalAmount.toLocaleString();

  return (
    `🎉 *Added to Order!*\n\n` +
    `${quantity}x ${item.name} - ${item.formattedPrice} each\n` +
    `Subtotal: ₦${(item.price * quantity).toLocaleString()}\n\n` +
    `*Current Order Total: ₦${totalAmount}*\n\n` +
    `What would you like to do next?\n\n` +
    menuHelpers.formatMainMenu()
  );
}

// Handle quantity selection (this is integrated into item selection now)
async function handleQuantitySelection(session, userInput) {
  return await handleItemSelection(session, userInput);
}

// Handle current order display
async function handleCurrentOrder(session) {
  const currentOrder = await Order.getCurrentOrder(session.sessionId);

  if (!currentOrder || currentOrder.items.length === 0) {
    return (
      `🛒 *Your cart is empty*\n\n` +
      `Start by selecting a category to add items:\n\n` +
      menuHelpers.formatMainMenu()
    );
  }

  let orderText = `🛒 *Your Current Order* (${currentOrder.orderNumber})\n\n`;

  currentOrder.items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    orderText += `${index + 1}. ${item.name}\n`;
    orderText += `   Qty: ${
      item.quantity
    } × ₦${item.price.toLocaleString()} = ₦${itemTotal.toLocaleString()}\n\n`;
  });

  orderText += `*Total: ₦${currentOrder.totalAmount.toLocaleString()}*\n\n`;
  orderText += `Options:\n`;
  orderText += `99 - Checkout this order\n`;
  orderText += `0 - Cancel this order\n`;
  orderText += `Or select a category to add more items`;

  return orderText;
}

// Handle order history
async function handleOrderHistory(session) {
  const orderHistory = await Order.getOrderHistory(session.sessionId);

  if (orderHistory.length === 0) {
    return (
      `📋 *No Order History*\n\n` +
      `You haven't completed any orders yet.\n\n` +
      menuHelpers.formatMainMenu()
    );
  }

  let historyText = `📋 *Your Order History*\n\n`;

  orderHistory.forEach((order, index) => {
    const orderDate = order.createdAt.toLocaleDateString();
    historyText += `${index + 1}. Order ${order.orderNumber}\n`;
    historyText += `   Date: ${orderDate}\n`;
    historyText += `   Items: ${order.items.length}\n`;
    historyText += `   Total: ₦${order.totalAmount.toLocaleString()}\n`;
    historyText += `   Status: ${order.status}\n\n`;
  });

  historyText += `Type any number to continue ordering:\n\n`;
  historyText += menuHelpers.formatMainMenu();

  return historyText;
}

async function handlePaymentVerification(session, userInput) {
  const reference = userInput.replace("ref_", "");
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Paystack verify response:", response.data); // Debug
    if (response.data.status && response.data.data.status === "success") {
      const order = await Order.findOne({ paymentReference: reference });
      if (order && order.totalAmount * 100 === response.data.data.amount) {
        order.status = "paid";
        order.paymentStatus = "success";
        await order.save();
        return (
          `✅ *Payment Successful!*\n\n` +
          `Order Number: ${order.orderNumber}\n` +
          `Total Amount: ₦${order.totalAmount.toLocaleString()}\n` +
          `Reference: ${reference}\n\n` +
          `Thank you for your order! 🎉\n\n` +
          menuHelpers.formatMainMenu()
        );
      } else {
        return (
          `❌ *Payment Verification Failed: Amount mismatch or order not found*\n\n` +
          menuHelpers.formatMainMenu()
        );
      }
    } else {
      return `❌ *Payment Failed*\n\n` + menuHelpers.formatMainMenu();
    }
  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );
    return (
      `❌ *Error Verifying Payment: ${error.message}*\n\n` +
      menuHelpers.formatMainMenu()
    );
  }
}

// Handle checkout
async function handleCheckout(session) {
  const currentOrder = await Order.getCurrentOrder(session.sessionId);

  if (!currentOrder || currentOrder.items.length === 0) {
    return (
      `❌ *No Order to Checkout*\n\n` +
      `Your cart is empty. Add some items first!\n\n` +
      menuHelpers.formatMainMenu()
    );
  }

  // Payment integration will be added later
  if (!session.customerEmail) {
    session.currentStep = "checkout";
    await session.save();
    return `📧 Please enter your email address to continue with payment.`;
  }

  // Create Paystack transaction
  try {
    const payload = {
      amount: currentOrder.totalAmount * 100, // Convert to kobo
      email: session.customerEmail,
      reference: `ref_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`,
      callback_url: `${
        process.env.NODE_ENV === "production"
          ? "https://cynical-punishment.pipeops.net"
          : "http://localhost:3000"
      }/payment/callback`,
      metadata: {
        orderId: currentOrder._id.toString(),
        orderNumber: currentOrder.orderNumber,
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        customerEmail: session.customerEmail,
      },
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
    };

    console.log("Paystack payload:", payload); // Debug

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Paystack initialize response:", response.data); // Debug

    if (response.data.status && response.data.data) {
      currentOrder.paymentReference = response.data.data.reference;
      await currentOrder.save();

      return {
        text:
          `✅ *Order Placed! Proceed to Payment*\n\n` +
          `Order Number: ${currentOrder.orderNumber}\n` +
          `Total Amount: ₦${currentOrder.totalAmount.toLocaleString()}\n\n` +
          `📋 *Order Summary:*\n` +
          currentOrder.items
            .map(
              (item) =>
                `• ${item.quantity}x ${item.name} - ₦${(
                  item.price * item.quantity
                ).toLocaleString()}`
            )
            .join("\n") +
          `\n\n` +
          `💳 *Payment Initiated*\nPlease complete the payment in the popup.`,
        paymentData: {
          email: session.customerEmail,
          amount: payload.amount,
          reference: response.data.data.reference,
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
          orderId: currentOrder._id.toString(),
          orderNumber: currentOrder.orderNumber,
        },
      };
    } else {
      console.error("Paystack initialization failed:", response.data);
      return (
        `❌ *Payment Initialization Failed*\n\n` + menuHelpers.formatMainMenu()
      );
    }
  } catch (error) {
    console.error("Checkout error:", error.response?.data || error.message);
    return (
      `❌ *Error Initiating Payment: ${error.message}*\n\n` +
      menuHelpers.formatMainMenu()
    );
  }
}

// Handle cancel order
async function handleCancelOrder(session) {
  const currentOrder = await Order.getCurrentOrder(session.sessionId);

  if (!currentOrder || currentOrder.items.length === 0) {
    return (
      `❌ *No Order to Cancel*\n\n` +
      `Your cart is already empty.\n\n` +
      menuHelpers.formatMainMenu()
    );
  }

  await currentOrder.cancelOrder();

  return (
    `✅ *Order Cancelled*\n\n` +
    `Your current order has been cancelled.\n\n` +
    `Would you like to start a new order?\n\n` +
    menuHelpers.formatMainMenu()
  );
}

// Handle back to main menu
async function handleBackToMainMenu(session) {
  session.currentStep = "main_menu";
  session.currentCategory = null;
  session.selectedItem = null;
  await session.save();

  return menuHelpers.formatMainMenu();
}

module.exports = {
  initializeChat,
  handleChatMessage,
};
