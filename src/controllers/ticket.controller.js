const ticketService = require("../services/ticket.service");
const prisma = require("../config/db");
const { PermissionEnum } = require("../utils/enums");
exports.convertChatToTicket = async (req, res) => {
  try {
    const { chatSessionId, chatUserId, subject, description, priority, userSource, userType } = req.body;
    const createdBy = req.user.id;
    console.log("userSource", userSource)
    console.log("userType", userType)
    const ticket = await ticketService.createTicketFromChat({
      chatSessionId,
      chatUserId,
      subject,
      description,
      priority,
      createdBy,
      userSource,
      userType
    });

    res.json({ success: true, ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ticket = await ticketService.updateTicketStatus(ticketId, status);

    res.json({ success: true, ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
};



exports.getAllTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      createdBy,
      chatSessionId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause for Prisma
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (createdBy) where.createdById = createdBy;
    if (chatSessionId) where.chatSessionId = chatSessionId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build order by
    const orderBy = {
      [sortBy]: sortOrder
    };

    // Execute queries in parallel
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          chatUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          sourceContact: {
            select: {
              id: true,
              fullName: true,
              email: true,
              subject: true,
              message: true,
              attachments: true,

            }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);
    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getAllTickets:', err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chatUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (err) {
    console.error('Error in getTicketById:', err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};

// Get tickets by user
exports.getTicketsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      status,
      priority,
      chatSessionId,
      page = 1,
      limit = 10
    } = req.query;

    // Build where clause
    const where = {
      createdById: userId
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (chatSessionId) where.chatSessionId = chatSessionId;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Execute queries in parallel
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          chatUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error in getTicketsByUser:', err);
    res.status(500).json({ message: "Failed to fetch user tickets" });
  }
};

// Get tickets by chat session
exports.getTicketsByChatSession = async (req, res) => {
  try {
    const { chatSessionId } = req.params;

    const tickets = await prisma.ticket.findMany({
      where: { chatSessionId },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chatUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (err) {
    console.error('Error in getTicketsByChatSession:', err);
    res.status(500).json({ message: "Failed to fetch chat session tickets" });
  }
};

// Get ticket statistics
exports.getTicketStats = async (req, res) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run multiple aggregations in parallel
    const [
      totalTickets,
      statusCounts,
      priorityCounts,
      ticketsToday,
      ticketsWithChatSession,
      ticketsByChatSession
    ] = await Promise.all([
      // Total tickets count
      prisma.ticket.count(),

      // Count by status
      prisma.ticket.groupBy({
        by: ['status'],
        _count: true
      }),

      // Count by priority
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: true
      }),

      // Tickets created today
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),

      // Tickets with chat session
      prisma.ticket.count({
        where: {
          chatSessionId: {
            not: null
          }
        }
      }),

      // Tickets grouped by chat session
      prisma.ticket.groupBy({
        by: ['chatSessionId'],
        _count: true,
        where: {
          chatSessionId: {
            not: null
          }
        }
      })
    ]);

    // Format status counts
    const statusStats = {
      open: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0
    };

    statusCounts.forEach(item => {
      statusStats[item.status] = item._count;
    });

    // Format priority counts
    const priorityStats = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    priorityCounts.forEach(item => {
      priorityStats[item.priority] = item._count;
    });

    res.json({
      success: true,
      data: {
        totalTickets,
        ...statusStats,
        ...priorityStats,
        ticketsToday,
        ticketsWithChatSession,
        uniqueChatSessions: ticketsByChatSession.length
      }
    });
  } catch (err) {
    console.error('Error in getTicketStats:', err);
    res.status(500).json({ message: "Failed to fetch ticket statistics" });
  }
};

// Get recent tickets
exports.getRecentTickets = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const tickets = await prisma.ticket.findMany({
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chatUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (err) {
    console.error('Error in getRecentTickets:', err);
    res.status(500).json({ message: "Failed to fetch recent tickets" });
  }
};

// EDIT TICKET - Only subject, description, and priority
exports.editTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { subject, description, priority } = req.body;

    // Validate that at least one field is provided
    if (!subject && !description && !priority) {
      return res.status(400).json({
        message: "At least one field (subject, description, or priority) must be provided"
      });
    }

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!existingTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Build update data object with only provided fields
    const updateData = {};
    if (subject) updateData.subject = subject;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chatUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // If ticket has a chat session, notify the chat backend about the update
    if (updatedTicket.chatSessionId) {
      const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL;

      // Use fetch but don't await to not block the response
      fetch(`${CHAT_BACKEND_URL}/internal/chat/ticket-updated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId: updatedTicket.chatSessionId,
          ticketId: updatedTicket.id,
          updates: updateData
        }),
      }).catch(err => {
        // Log error but don't fail the request
        console.error('Failed to notify chat backend about ticket update:', err);
      });
    }

    res.json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket
    });
  } catch (err) {
    console.error('Error in editTicket:', err);
    res.status(500).json({ message: "Failed to update ticket" });
  }
};

// DELETE TICKET
exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!existingTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Store chatSessionId before deletion for notification
    const chatSessionId = existingTicket.chatSessionId;

    // Delete the ticket
    await prisma.ticket.delete({
      where: { id: ticketId }
    });

    // If ticket had a chat session, notify the chat backend about the deletion
    if (chatSessionId) {
      const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL;

      // Use fetch but don't await to not block the response
      fetch(`${CHAT_BACKEND_URL}/internal/chat/ticket-deleted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId,
          ticketId
        }),
      }).catch(err => {
        // Log error but don't fail the request
        console.error('Failed to notify chat backend about ticket deletion:', err);
      });
    }

    res.json({
      success: true,
      message: "Ticket deleted successfully"
    });
  } catch (err) {
    console.error('Error in deleteTicket:', err);
    res.status(500).json({ message: "Failed to delete ticket" });
  }
};

// Bulk delete tickets
exports.bulkDeleteTickets = async (req, res) => {
  try {
    const { ticketIds } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ message: "Please provide an array of ticket IDs" });
    }

    // Get tickets to be deleted (for notification)
    const ticketsToDelete = await prisma.ticket.findMany({
      where: {
        id: { in: ticketIds }
      },
      select: {
        id: true,
        chatSessionId: true
      }
    });

    // Delete the tickets
    const deleteResult = await prisma.ticket.deleteMany({
      where: {
        id: { in: ticketIds }
      }
    });

    // Notify chat backend about deleted tickets
    const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL;

    // Group notifications by chat session
    const ticketsByChatSession = ticketsToDelete.reduce((acc, ticket) => {
      if (ticket.chatSessionId) {
        if (!acc[ticket.chatSessionId]) {
          acc[ticket.chatSessionId] = [];
        }
        acc[ticket.chatSessionId].push(ticket.id);
      }
      return acc;
    }, {});

    // Send notifications (don't await)
    Object.entries(ticketsByChatSession).forEach(([chatSessionId, ticketIds]) => {
      fetch(`${CHAT_BACKEND_URL}/internal/chat/tickets-deleted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSessionId,
          ticketIds
        }),
      }).catch(err => {
        console.error('Failed to notify chat backend about bulk ticket deletion:', err);
      });
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} tickets`,
      count: deleteResult.count
    });
  } catch (err) {
    console.error('Error in bulkDeleteTickets:', err);
    res.status(500).json({ message: "Failed to delete tickets" });
  }
};




//////////////////
////CONTACT//////////
//////////////////

// exports.convertContactToTicket = async (req, res) => {
//   try {
//     const { contactId, subject, description, priority, userSource, userType } = req.body;
//     const createdBy = req.user.id;

//     const ticket = await prisma.ticket.create({
//       data: {
//         subject,
//         description,
//         priority,
//         createdById: createdBy,
//         source: "CONTACT",
//         sourceContactId: contactId,
//         chatUserId: null,
//         userSource,
//         userType
//       }
//     });

//     res.json({ success: true, ticket });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to create ticket" });
//   }
// };

exports.convertContactToTicket = async (req, res) => {
    try {
        const { contactId, subject, description, priority, userSource, userType } = req.body;
        const staffId = req.user.id;

        // Start a transaction
        const result = await prisma.$transaction(async (prisma) => {
            // Get contact with lock check
            const contact = await prisma.contactSupport.findUnique({
                where: { id: contactId },
                include: {
                    tickets: {
                        include: {
                            createdBy: {
                                select: { id: true, name: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            if (!contact) {
                throw new Error("Contact not found");
            }

            // Check if already converted
            if (contact.status === "CONVERTED") {
                throw new Error(`This contact was already converted to a ticket by ${contact.convertedBy?.name || 'another staff'} on ${new Date(contact.convertedAt).toLocaleString()}`);
            }

            const now = new Date();

            // Check for recent ticket (within last 10 minutes)
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const recentTicket = contact.tickets.find(ticket => 
                ticket.createdAt > tenMinutesAgo
            );

            if (recentTicket) {
                const timeSinceTicket = Math.floor((now - recentTicket.createdAt) / 1000);
                const remainingCooldown = 600 - timeSinceTicket;
                
                throw new Error(
                    `A ticket was already created ${Math.floor(timeSinceTicket / 60)} minutes ago by ${recentTicket.createdBy?.name || 'another staff'}. ` +
                    `Please wait ${Math.ceil(remainingCooldown / 60)} more minutes before creating another ticket.`
                );
            }

            // Check lock status
            if (contact.lockExpiresAt && contact.lockExpiresAt > now) {
                if (contact.lockedById !== staffId) {
                    const timeRemaining = Math.floor((contact.lockExpiresAt - now) / 1000);
                    throw new Error(
                        `This contact is being handled by ${contact.lockedBy?.name || 'another staff member'}. ` +
                        `Please wait ${Math.ceil(timeRemaining / 60)} minutes.`
                    );
                }
            } else {
                // If no lock or expired, lock it now for 10 minutes
                await prisma.contactSupport.update({
                    where: { id: contactId },
                    data: {
                        lockedById: staffId,
                        lockedAt: now,
                        lockExpiresAt: new Date(now.getTime() + 10 * 60 * 1000)
                    }
                });
            }

            // Create the ticket
            const ticket = await prisma.ticket.create({
                data: {
                    subject: subject || contact.subject,
                    description: description || contact.message,
                    priority: priority || "MEDIUM",
                    createdById: staffId,
                    source: "CONTACT",
                    sourceContactId: contactId,
                    userSource: userSource || contact.source,
                    userType: userType || contact.type,
                    status: "UNASSIGNED"
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            // Update contact status
            await prisma.contactSupport.update({
                where: { id: contactId },
                data: {
                    status: "CONVERTED",
                    convertedById: staffId,
                    convertedAt: now,
                    lockedById: null,
                    lockedAt: null,
                    lockExpiresAt: null
                }
            });

            return { ticket, contact };
        });

        res.json({
            success: true,
            message: "Ticket created successfully",
            ticket: result.ticket,
            contact: {
                id: result.contact.id,
                status: "CONVERTED",
                convertedBy: {
                    id: req.user.id,
                    name: req.user.name
                },
                convertedAt: new Date()
            },
            createdBy: result.ticket.createdBy,
            createdAt: result.ticket.createdAt,
            note: "Another ticket can be created after 10 minutes from now"
        });

    } catch (err) {
        console.error("Error converting contact to ticket:", err);
        
        // Handle specific error messages
        if (err.message.includes("already converted") || 
            err.message.includes("already created") ||
            err.message.includes("being handled")) {
            return res.status(409).json({ 
                success: false,
                message: err.message,
                requiresCooldown: true
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: "Failed to create ticket",
            error: err.message 
        });
    }
};