const express = require("express");
const router = express.Router();
const {
  initializeChat,
  handleChatMessage,
} = require("../controllers/chatControllers");

router.post("/init", initializeChat);

router.post("/", handleChatMessage);

module.exports = router;
