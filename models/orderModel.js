const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    category: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "paid"],
      default: "pending",
    },
    paymentReference: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD${Date.now().toString().slice(-6)}${(count + 1)
      .toString()
      .padStart(3, "0")}`;
  }

  // Calculate total amount
  this.totalAmount = this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  next();
});

// Get current pending order for a session
orderSchema.statics.getCurrentOrder = function (sessionId) {
  return this.findOne({
    sessionId,
    status: "pending",
  }).sort({ createdAt: -1 });
};

// Get order history for a session
orderSchema.statics.getOrderHistory = function (sessionId) {
  return this.find({
    sessionId,
    status: { $in: ["completed", "paid"] },
  })
    .sort({ createdAt: -1 })
    .limit(10);
};

// Add item to current order
orderSchema.statics.addItemToOrder = async function (
  sessionId,
  deviceId,
  item
) {
  let order = await this.getCurrentOrder(sessionId);

  if (!order) {
    order = new this({
      sessionId,
      deviceId,
      items: [],
    });
  }

  // Check if item already exists in order
  const existingItemIndex = order.items.findIndex(
    (orderItem) => orderItem.itemId === item.itemId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    order.items[existingItemIndex].quantity += item.quantity;
  } else {
    // Add new item
    order.items.push(item);
  }

  await order.save();
  return order;
};

// Remove item from order
orderSchema.methods.removeItem = function (itemId) {
  this.items = this.items.filter((item) => item.itemId !== itemId);
  return this.save();
};

// Clear all items from order
orderSchema.methods.clearOrder = function () {
  this.items = [];
  return this.save();
};

// Complete order
orderSchema.methods.completeOrder = function (paymentReference = null) {
  this.status = paymentReference ? "paid" : "completed";
  if (paymentReference) {
    this.paymentReference = paymentReference;
    this.paymentStatus = "success";
  }
  return this.save();
};

// Cancel order
orderSchema.methods.cancelOrder = function () {
  this.status = "cancelled";
  return this.save();
};

module.exports = mongoose.model("Order", orderSchema);
