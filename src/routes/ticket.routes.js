const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const { authenticate } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/checkPermission');
const { PermissionEnum } = require("../utils/enums");

// Apply authentication to all routes
router.use(authenticate);

// GET routes
router.get('/getallticket', ticketController.getAllTickets);
router.get('/stats',  ticketController.getTicketStats);
router.get('/recent', ticketController.getRecentTickets);
router.get('/user/:userId',  ticketController.getTicketsByUser);
router.get('/chat-session/:chatSessionId',  ticketController.getTicketsByChatSession);
router.get('/:ticketId',  ticketController.getTicketById);

// POST routes
router.post("/convert",  ticketController.convertChatToTicket);
router.post("/convert-contact",  ticketController.convertContactToTicket);

// PATCH routes (status update)
router.patch("/:ticketId/status",  ticketController.updateStatus);

// EDIT route (subject, description, priority)
router.put("/:ticketId",  ticketController.editTicket);
router.patch("/:ticketId", ticketController.editTicket);

// DELETE routes
router.delete("/:ticketId",  ticketController.deleteTicket);
router.delete("/bulk/delete",  ticketController.bulkDeleteTickets);

module.exports = router;