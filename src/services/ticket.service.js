const prisma = require("../config/db");

const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL;

exports.createTicketFromChat = async ({
  chatSessionId,
  chatUserId,
  subject,
  description,
  priority,
  createdBy,
  userSource,
  userType
}) => {
  // 1️⃣ Create Ticket
  const ticket = await prisma.ticket.create({
    data: {
      chatSessionId,
      chatUserId,
      subject,
      description,
      priority,
      createdById: createdBy,
      userSource,
      userType
    },
  });

  // 2️⃣ Inform Chat Backend
  await fetch(`${CHAT_BACKEND_URL}/internal/chat/attach-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatSessionId,
      ticketId: ticket.id,
    }),
  });

  return ticket;
};

exports.updateTicketStatus = async (ticketId, status) => {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status },
  });

  // 🔁 Sync Chat Status
  if (ticket.chatSessionId) {
    await fetch(`${CHAT_BACKEND_URL}/internal/chat/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatSessionId: ticket.chatSessionId,
        ticketStatus: status,
      }),
    });
  }

  return ticket;
};

