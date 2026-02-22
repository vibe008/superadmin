// routes/contact.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const contactController = require("../controllers/contact.controller");
const ticketController = require("../controllers/ticket.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Public route (no authentication)
router.post("/contact", upload.array("attachments", 5), contactController.submitContact);

// Protected routes (require authentication)
router.use(authenticate); // Apply authentication to all routes below

// Contact management
router.get("/contacts", contactController.getAllContacts);
router.get("/contacts/:contactId", contactController.getContactById);
router.delete("/contacts/:contactId", contactController.deleteContactById);

// Lock mechanism
router.get("/contacts/:contactId/lock", contactController.checkContactLock);
router.post("/contacts/:contactId/lock", contactController.lockContact);
router.post("/contacts/:contactId/unlock", contactController.unlockContact);

// Check if can create ticket
router.get("/contacts/:contactId/can-create-ticket", contactController.canCreateTicket);

// Convert contact to ticket (with permission check)


// Get ticket history for a contact
router.get("/contacts/:contactId/tickets", contactController.getContactTicketHistory);

module.exports = router;