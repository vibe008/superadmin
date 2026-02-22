// routes/reply.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const replyController = require("../controllers/reply.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// All routes require authentication
router.use(authenticate);

// Reply routes
router.post(
    "/contacts/:contactId/replies",
    upload.array("attachments", 5),
    replyController.sendReply
);

router.get(
    "/contacts/:contactId/replies",
    replyController.getContactReplies
);

router.get(
    "/replies/:replyId",
    replyController.getReplyById
);

router.put(
    "/replies/:replyId",
    replyController.updateReply
);

router.delete(
    "/replies/:replyId",
    replyController.deleteReply
);

router.post(
    "/replies/:replyId/resend",
    replyController.resendReplyEmail
);

module.exports = router;