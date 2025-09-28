const express = require("express");
const router = express.Router();
const {
  initializeChat,
  handleChatMessage,
} = require("../controllers/chatControllers");
const { checkPaymentStatus } = require("../controllers/paymentController");

router.post("/init", initializeChat);

router.post("/", handleChatMessage);
router.post("/check-payment", checkPaymentStatus);

module.exports = router;
