const express = require("express");
const router = express.Router();
const chatuserController = require("../controllers/chatuser.controller");

router.post("/init", chatuserController.initChat);

module.exports = router;