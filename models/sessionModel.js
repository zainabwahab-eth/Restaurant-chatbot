const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    currentStep: {
      type: String,
      enum: [
        "main_menu",
        "browsing_menu",
        "selecting_item",
        "quantity",
        "checkout",
        "awaiting_email",
      ],
      default: "main_menu",
    },
    customerEmail: {
      type: String,
      default: null,
    },
    currentCategory: {
      type: String,
      default: null,
    },
    selectedItem: {
      type: Object,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update last activity on each interaction
sessionSchema.pre("save", function (next) {
  this.lastActivity = new Date();
  next();
});

// Clean up old inactive sessions (older than 24 hours)
sessionSchema.statics.cleanupOldSessions = function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.deleteMany({
    lastActivity: { $lt: oneDayAgo },
    isActive: false,
  });
};

// Find or create session
sessionSchema.statics.findOrCreate = async function (sessionId, deviceId) {
  let session = await this.findOne({ sessionId });

  if (!session) {
    session = new this({
      sessionId,
      deviceId,
      currentStep: "main_menu",
    });
    await session.save();
  } else {
    // Update device ID if changed and last activity
    session.deviceId = deviceId;
    session.lastActivity = new Date();
    await session.save();
  }

  return session;
};

module.exports = mongoose.model("Session", sessionSchema);
