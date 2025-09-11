const express = require("express");
const router = express.Router();
const {
  initializeChat,
  handleChatMessage,
} = require("../controllers/chatControllers");

// Initialize chat - called when page loads
// POST /chat/init
router.post("/init", initializeChat);

// Handle chat messages - called when user sends message
// POST /chat
router.post("/", handleChatMessage);

module.exports = router;
