const express = require("express");
const router = express.Router();
const authcontroller = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.post("/login", authcontroller.login);
router.post("/logout", authenticate, authcontroller.logout);
router.get("/staff/:staffId/status", authenticate, authcontroller.getStaffStatus);

module.exports = router;