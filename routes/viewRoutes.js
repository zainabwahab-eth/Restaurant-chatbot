const express = require("express");
const viewController = require("../controllers/viewControllers.js");

const router = express.Router();

router.get("/", viewController.getChatPage);

module.exports = router;
