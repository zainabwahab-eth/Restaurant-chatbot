const Session = require("../models/sessionModel.js");
const Order = require("../models/orderModel.js");
const { menuHelpers } = require("../data/menuItems.js");

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

    res.json({
      success: true,
      response: response,
    });
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

  // For now, we'll complete the order without payment
  // Payment integration will be added later
  await currentOrder.completeOrder();

  let checkoutText = `✅ *Order Placed Successfully!*\n\n`;
  checkoutText += `Order Number: ${currentOrder.orderNumber}\n`;
  checkoutText += `Total Amount: ₦${currentOrder.totalAmount.toLocaleString()}\n\n`;
  checkoutText += `📋 *Order Summary:*\n`;

  currentOrder.items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    checkoutText += `• ${item.quantity}x ${
      item.name
    } - ₦${itemTotal.toLocaleString()}\n`;
  });

  checkoutText += `\nThank you for your order! 🎉\n\n`;
  checkoutText += `Would you like to place another order?\n\n`;
  checkoutText += menuHelpers.formatMainMenu();

  return checkoutText;
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
