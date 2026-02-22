// controllers/contact.controller.js
const prisma = require("../config/db");
const cloudinary = require("../config/cloudinary");

// SUBMIT CONTACT FORM - Public route
exports.submitContact = async (req, res) => {
    try {
        const { fullName, email, subject, message, source, type } = req.body;
        const files = req.files;
        
        if (!fullName || !email || !subject || !message) {
            return res.status(400).json({
                message: "Please provide fullName, email, subject, and message"
            });
        }

        const attachments = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            resource_type: "auto",
                            folder: "contacts",
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(file.buffer);
                });

                attachments.push({
                    url: result.secure_url,
                    publicId: result.public_id,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    fileSize: file.size
                });
            }
        }

        const contact = await prisma.contactSupport.create({
            data: {
                fullName,
                email,
                subject,
                message,
                attachments: attachments.length > 0 ? attachments : null,
                status: "PENDING",
                source,
                type
            }
        });

        res.status(201).json({
            message: "Contact form submitted successfully",
            contact: {
                id: contact.id,
                fullName: contact.fullName,
                email: contact.email,
                subject: contact.subject,
                status: contact.status,
                createdAt: contact.createdAt
            }
        });

    } catch (error) {
        console.error("Error in submitContact:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Get all contacts with lock status
exports.getAllContacts = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const staffId = req.user.id;

        // Clean up expired locks first
        await prisma.contactSupport.updateMany({
            where: {
                lockExpiresAt: {
                    lt: new Date()
                }
            },
            data: {
                lockedById: null,
                lockedAt: null,
                lockExpiresAt: null
            }
        });

        // Build where clause
        const where = {};
        if (status) {
            where.status = status;
        }

        const contacts = await prisma.contactSupport.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                convertedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lockedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                tickets: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        subject: true,
                        status: true,
                        priority: true,
                        createdAt: true,
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5 // Show last 5 tickets
                }
            }
        });

        // Process each contact
        const contactsWithStatus = contacts.map(contact => {
            const now = new Date();
            
            // Check if contact is locked
            const isLocked = contact.lockExpiresAt && contact.lockExpiresAt > now;
            
            // Calculate time remaining for lock
            let timeRemaining = 0;
            if (isLocked) {
                timeRemaining = Math.max(0, Math.floor((contact.lockExpiresAt - now) / 1000));
            }
            
            // Check cooldown period (10 minutes between tickets)
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const recentTickets = contact.tickets.filter(ticket => 
                ticket.createdAt > tenMinutesAgo
            );
            
            const hasRecentTicket = recentTickets.length > 0;
            let cooldownRemaining = 0;
            let cooldownExpiry = null;
            
            if (hasRecentTicket) {
                const mostRecentTicket = recentTickets[0];
                cooldownExpiry = new Date(mostRecentTicket.createdAt.getTime() + 10 * 60 * 1000);
                cooldownRemaining = Math.max(0, Math.floor((cooldownExpiry - now) / 1000));
            }
            
            // Determine if current staff can create ticket
            let canCreateTicket = true;
            let cannotCreateReason = null;
            let actionMessage = null;
            
            if (contact.status === "CONVERTED") {
                canCreateTicket = false;
                cannotCreateReason = "This contact has already been converted to a ticket";
                actionMessage = `Converted by ${contact.convertedBy?.name || 'Unknown'} on ${new Date(contact.convertedAt).toLocaleString()}`;
            } else if (isLocked && contact.lockedById !== staffId) {
                canCreateTicket = false;
                cannotCreateReason = `Being handled by ${contact.lockedBy?.name || 'another staff'}`;
                actionMessage = `Lock expires in ${formatTimeDuration(timeRemaining)}`;
            } else if (hasRecentTicket) {
                canCreateTicket = false;
                cannotCreateReason = `Cooldown period active`;
                actionMessage = `Next ticket can be created in ${formatTimeDuration(cooldownRemaining)}`;
            } else if (isLocked && contact.lockedById === staffId) {
                actionMessage = `You have locked this contact. Lock expires in ${formatTimeDuration(timeRemaining)}`;
            }

            return {
                id: contact.id,
                fullName: contact.fullName,
                email: contact.email,
                subject: contact.subject,
                message: contact.message,
                status: contact.status,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
                source: contact.source,
                type: contact.type,
                
                // Lock information
                isLocked,
                lockedBy: contact.lockedBy,
                lockTimeRemaining: timeRemaining,
                lockTimeRemainingFormatted: formatTimeDuration(timeRemaining),
                lockExpiresAt: contact.lockExpiresAt,
                
                // Cooldown information
                isInCooldown: hasRecentTicket,
                cooldownRemaining,
                cooldownRemainingFormatted: formatTimeDuration(cooldownRemaining),
                cooldownExpiry,
                
                // Ticket creation permissions
                canCreateTicket,
                cannotCreateReason,
                actionMessage,
                
                // Ticket history
                totalTickets: contact.tickets.length,
                recentTickets: contact.tickets.map(ticket => ({
                    id: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    subject: ticket.subject,
                    status: ticket.status,
                    priority: ticket.priority,
                    createdAt: ticket.createdAt,
                    createdAtFormatted: new Date(ticket.createdAt).toLocaleString(),
                    createdBy: ticket.createdBy?.name || 'Unknown',
                    timeAgo: getTimeAgo(ticket.createdAt)
                })),
                
                // Conversion info
                convertedBy: contact.convertedBy,
                convertedAt: contact.convertedAt,
                convertedAtFormatted: contact.convertedAt ? new Date(contact.convertedAt).toLocaleString() : null
            };
        });

        const total = await prisma.contactSupport.count({ where });

        res.json({
            success: true,
            contacts: contactsWithStatus,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error("Error in getAllContacts:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Helper function for time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
}

// Helper function to check if staff can create ticket
exports.canStaffCreateTicket = (contact, staffId) => {
    // If no lock exists, can create
    if (!contact.lockExpiresAt || contact.lockExpiresAt < new Date()) {
        return true;
    }
    
    // If lock exists and it's this staff who locked it, can create
    if (contact.lockedById === staffId && contact.lockExpiresAt > new Date()) {
        return true;
    }
    
    // If lock exists and it's someone else, cannot create
    return false;
};

// Check lock status for a specific contact
exports.checkContactLock = async (req, res) => {
    try {
        const { contactId } = req.params;
        const staffId = req.user.id;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId },
            include: {
                lockedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                convertedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        // Clean up expired lock
        if (contact.lockExpiresAt && contact.lockExpiresAt < new Date()) {
            await prisma.contactSupport.update({
                where: { id: contactId },
                data: {
                    lockedById: null,
                    lockedAt: null,
                    lockExpiresAt: null
                }
            });
            contact.lockedById = null;
            contact.lockedBy = null;
        }

        const canCreate = this.canStaffCreateTicket(contact, staffId);
        const timeRemaining = contact.lockExpiresAt ? 
            Math.max(0, Math.floor((contact.lockExpiresAt - new Date()) / 1000)) : 0;

        res.json({
            success: true,
            contact: {
                ...contact,
                canCreateTicket: canCreate,
                isLocked: contact.lockExpiresAt && contact.lockExpiresAt > new Date(),
                timeRemaining,
                lockedBy: contact.lockedBy,
                convertedBy: contact.convertedBy
            }
        });

    } catch (error) {
        console.error("Error in checkContactLock:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Lock a contact before creating ticket (optional - for UI)
exports.lockContact = async (req, res) => {
    try {
        const { contactId } = req.params;
        const staffId = req.user.id;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        // Check if already locked by someone else
        if (contact.lockExpiresAt && 
            contact.lockExpiresAt > new Date() && 
            contact.lockedById !== staffId) {
            
            const locker = await prisma.staff.findUnique({
                where: { id: contact.lockedById },
                select: { name: true }
            });

            const timeRemaining = Math.floor((contact.lockExpiresAt - new Date()) / 1000);
            
            return res.status(409).json({
                message: `This contact is being handled by ${locker?.name || 'another staff member'}`,
                timeRemaining,
                lockedBy: locker
            });
        }

        // Lock or refresh lock
        const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const updatedContact = await prisma.contactSupport.update({
            where: { id: contactId },
            data: {
                lockedById: staffId,
                lockedAt: new Date(),
                lockExpiresAt
            },
            include: {
                lockedBy: {
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
            message: "Contact locked successfully",
            contact: updatedContact,
            timeRemaining: 600 // 10 minutes in seconds
        });

    } catch (error) {
        console.error("Error in lockContact:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.canCreateTicket = async (req, res) => {
    try {
        const { contactId } = req.params;
        const staffId = req.user.id;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId },
            include: {
                convertedBy: {
                    select: { id: true, name: true, email: true }
                },
                lockedBy: {
                    select: { id: true, name: true, email: true }
                },
                tickets: {
                    include: {
                        createdBy: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!contact) {
            return res.status(404).json({ 
                success: false,
                message: "Contact not found" 
            });
        }

        const now = new Date();
        
        // Check if already converted
        if (contact.status === "CONVERTED") {
            return res.json({
                success: false,
                canCreate: false,
                reason: "CONVERTED",
                message: "This contact has already been converted to a ticket",
                convertedBy: contact.convertedBy,
                convertedAt: contact.convertedAt,
                ticket: contact.tickets[0]
            });
        }

        // Check for recent ticket (within last 10 minutes)
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        const recentTicket = contact.tickets.find(ticket => 
            ticket.createdAt > tenMinutesAgo
        );

        if (recentTicket) {
            const timeSinceTicket = Math.floor((now - recentTicket.createdAt) / 1000);
            const remainingCooldown = Math.max(0, 600 - timeSinceTicket);
            
            return res.json({
                success: false,
                canCreate: false,
                reason: "COOLDOWN",
                message: `A ticket was created ${Math.floor(timeSinceTicket / 60)} minutes ago by ${recentTicket.createdBy?.name || 'another staff'}`,
                timeRemaining: remainingCooldown,
                timeRemainingMinutes: Math.ceil(remainingCooldown / 60),
                lastTicket: recentTicket,
                createdBy: recentTicket.createdBy,
                createdAt: recentTicket.createdAt
            });
        }

        // Check lock status
        if (contact.lockExpiresAt && contact.lockExpiresAt > now) {
            if (contact.lockedById !== staffId) {
                const timeRemaining = Math.floor((contact.lockExpiresAt - now) / 1000);
                
                return res.json({
                    success: false,
                    canCreate: false,
                    reason: "LOCKED",
                    message: `Being handled by ${contact.lockedBy?.name || 'another staff member'}`,
                    timeRemaining,
                    timeRemainingMinutes: Math.ceil(timeRemaining / 60),
                    lockedBy: contact.lockedBy,
                    lockExpiresAt: contact.lockExpiresAt
                });
            } else {
                // Staff who locked can create
                return res.json({
                    success: true,
                    canCreate: true,
                    reason: "OWN_LOCK",
                    message: "You have this contact locked",
                    timeRemaining: Math.floor((contact.lockExpiresAt - now) / 1000),
                    lockedBy: contact.lockedBy
                });
            }
        }

        // No locks, no recent tickets - can create
        return res.json({
            success: true,
            canCreate: true,
            reason: "AVAILABLE",
            message: "You can create a ticket for this contact"
        });

    } catch (error) {
        console.error("Error in canCreateTicket:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


// Get contact by ID
exports.getContactById = async (req, res) => {
    try {
        const { contactId } = req.params;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId },
            include: {
                convertedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lockedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                tickets: {
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        res.json({
            success: true,
            contact
        });

    } catch (error) {
        console.error("Error in getContactById:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Delete contact
exports.deleteContactById = async (req, res) => {
    try {
        const { contactId } = req.params;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            return res.status(404).json({
                message: "Contact not found"
            });
        }

        await prisma.contactSupport.delete({
            where: { id: contactId }
        });

        res.json({
            success: true,
            message: "Contact deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

exports.unlockContact = async (req, res) => {
    try {
        const { contactId } = req.params;
        const staffId = req.user.id;

        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        // Check if this staff owns the lock
        if (contact.lockedById !== staffId) {
            return res.status(403).json({ 
                message: "You cannot unlock a contact locked by another staff member" 
            });
        }

        // Release the lock
        const updatedContact = await prisma.contactSupport.update({
            where: { id: contactId },
            data: {
                lockedById: null,
                lockedAt: null,
                lockExpiresAt: null
            }
        });

        res.json({
            success: true,
            message: "Contact unlocked successfully",
            contact: updatedContact
        });

    } catch (error) {
        console.error("Error in unlockContact:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.getContactTicketHistory = async (req, res) => {
    try {
        const { contactId } = req.params;

        const tickets = await prisma.ticket.findMany({
            where: {
                sourceContactId: contactId
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
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate time differences
        const ticketsWithTiming = tickets.map((ticket, index) => {
            const nextTicket = tickets[index + 1];
            let timeUntilNext = null;
            
            if (nextTicket) {
                const diffInSeconds = Math.floor((nextTicket.createdAt - ticket.createdAt) / 1000);
                timeUntilNext = {
                    seconds: diffInSeconds,
                    minutes: Math.floor(diffInSeconds / 60),
                    formatted: formatTimeDuration(diffInSeconds)
                };
            }

            return {
                ...ticket,
                timeUntilNextTicket: timeUntilNext,
                createdAtFormatted: ticket.createdAt.toLocaleString()
            };
        });

        res.json({
            success: true,
            contactId,
            totalTickets: tickets.length,
            tickets: ticketsWithTiming
        });

    } catch (error) {
        console.error("Error in getContactTicketHistory:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Helper function to format time duration
function formatTimeDuration(seconds) {
    if (seconds < 60) {
        return `${seconds} seconds`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds > 0 ? remainingSeconds + ' seconds' : ''}`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

