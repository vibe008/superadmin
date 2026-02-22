// controllers/reply.controller.js
const prisma = require("../config/db");
const cloudinary = require("../config/cloudinary");
const transporter = require("../config/email");
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const paths = require("../config/paths");

// Helper function to load and compile email template
const loadTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(paths.templates.email, `${templateName}.hbs`);
        console.log('Loading template from:', templatePath);
        
        // Check if file exists
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }
        
        const source = fs.readFileSync(templatePath, 'utf-8');
        const template = handlebars.compile(source);
        return template(data);
    } catch (error) {
        console.error('Error loading template:', error);
        throw new Error(`Failed to load email template: ${error.message}`);
    }
};

// Send reply to contact
exports.sendReply = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { message } = req.body;
        const staffId = req.user.id;
        const files = req.files || [];

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Reply message is required"
            });
        }

        // Get contact and staff details first (outside transaction)
        const contact = await prisma.contactSupport.findUnique({
            where: { id: contactId },
            include: {
                tickets: {
                    take: 1,
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

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        // Upload attachments to cloudinary (this can take time)
        const attachments = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            resource_type: "auto",
                            folder: "contact-replies",
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
                    fileSize: file.size,
                    format: result.format
                });
            }
        }

        // Prepare email attachments for nodemailer
        const emailAttachments = attachments.map(att => ({
            filename: att.fileName,
            path: att.url,
            contentType: att.fileType
        }));

        // Compile email template
        const templateData = {
            fullName: contact.fullName,
            originalMessage: contact.message,
            replyMessage: message,
            staffName: staff.name,
            hasAttachments: attachments.length > 0,
            attachments: attachments,
            ticketUrl: process.env.FRONTEND_URL + `/tickets/${contact.tickets[0]?.id || ''}`,
            year: new Date().getFullYear()
        };

        const emailHtml = await loadTemplate('contact-reply', templateData);

        // Send email (this can take time)
        let emailSent = true;
        let emailError = null;

        try {
            await transporter.sendMail({
                from: `"Support Team" <${process.env.EMAIL_USER}>`,
                to: contact.email,
                subject: `Re: ${contact.subject}`,
                html: emailHtml,
                attachments: emailAttachments,
                inReplyTo: contact.id,
                references: [contact.id]
            });
            console.log('Email sent successfully');
        } catch (error) {
            console.error("Email sending failed:", error);
            emailSent = false;
            emailError = error.message;
        }

        // Now create the reply record in database (short operation)
        const reply = await prisma.contactReply.create({
            data: {
                contactId,
                staffId,
                message,
                attachments: attachments.length > 0 ? attachments : null,
                emailSent
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Update contact status if needed (short operation)
        if (contact.status !== "CONVERTED") {
            await prisma.contactSupport.update({
                where: { id: contactId },
                data: {
                    status: "REPLIED",
                    updatedAt: new Date()
                }
            });
        }

        res.json({
            success: true,
            message: emailSent ? "Reply sent successfully" : "Reply saved but email failed to send",
            reply: {
                id: reply.id,
                message: reply.message,
                attachments: reply.attachments,
                emailSent,
                emailError,
                createdAt: reply.createdAt,
                staff: {
                    id: staff.id,
                    name: staff.name
                }
            }
        });

    } catch (error) {
        console.error("Error in sendReply:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send reply",
            error: error.message
        });
    }
};

// Get all replies for a contact
exports.getContactReplies = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const replies = await prisma.contactReply.findMany({
            where: { contactId },
            skip,
            take: parseInt(limit),
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        const total = await prisma.contactReply.count({
            where: { contactId }
        });

        res.json({
            success: true,
            replies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error("Error in getContactReplies:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch replies",
            error: error.message
        });
    }
};

// Get single reply by ID
exports.getReplyById = async (req, res) => {
    try {
        const { replyId } = req.params;

        const reply = await prisma.contactReply.findUnique({
            where: { id: replyId },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                contact: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        subject: true
                    }
                }
            }
        });

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: "Reply not found"
            });
        }

        res.json({
            success: true,
            reply
        });

    } catch (error) {
        console.error("Error in getReplyById:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch reply",
            error: error.message
        });
    }
};

// Update reply (staff can edit their own replies within a time limit)
exports.updateReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const { message } = req.body;
        const staffId = req.user.id;

        const reply = await prisma.contactReply.findUnique({
            where: { id: replyId }
        });

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: "Reply not found"
            });
        }

        // Check if staff owns this reply
        if (reply.staffId !== staffId) {
            return res.status(403).json({
                success: false,
                message: "You can only edit your own replies"
            });
        }

        // Check if reply is within edit window (e.g., 5 minutes)
        const editWindow = 5 * 60 * 1000; // 5 minutes
        const timeSinceCreation = Date.now() - reply.createdAt.getTime();
        
        if (timeSinceCreation > editWindow) {
            return res.status(403).json({
                success: false,
                message: "Replies can only be edited within 5 minutes of sending"
            });
        }

        const updatedReply = await prisma.contactReply.update({
            where: { id: replyId },
            data: {
                message,
                updatedAt: new Date()
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: "Reply updated successfully",
            reply: updatedReply
        });

    } catch (error) {
        console.error("Error in updateReply:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update reply",
            error: error.message
        });
    }
};

// Delete reply (soft delete or actual delete)
exports.deleteReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const staffId = req.user.id;
        const { permanent } = req.query; // Optional query param for permanent delete

        const reply = await prisma.contactReply.findUnique({
            where: { id: replyId },
            include: {
                contact: true
            }
        });

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: "Reply not found"
            });
        }

        // Check if staff owns this reply or is admin
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { isSuperAdmin: true }
        });

        if (reply.staffId !== staffId && !staff?.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this reply"
            });
        }

        if (permanent === 'true') {
            // Permanent delete
            await prisma.contactReply.delete({
                where: { id: replyId }
            });
        } else {
            // Soft delete - you might want to add a deletedAt field to the model
            // For now, we'll just delete permanently
            await prisma.contactReply.delete({
                where: { id: replyId }
            });
        }

        res.json({
            success: true,
            message: "Reply deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteReply:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete reply",
            error: error.message
        });
    }
};

// Resend email for a reply
exports.resendReplyEmail = async (req, res) => {
    try {
        const { replyId } = req.params;

        const reply = await prisma.contactReply.findUnique({
            where: { id: replyId },
            include: {
                contact: true,
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: "Reply not found"
            });
        }

        // Prepare email attachments
        const emailAttachments = reply.attachments ? reply.attachments.map(att => ({
            filename: att.fileName,
            path: att.url,
            contentType: att.fileType
        })) : [];

        // Compile email template
        const templateData = {
            fullName: reply.contact.fullName,
            originalMessage: reply.contact.message,
            replyMessage: reply.message,
            staffName: reply.staff.name,
            hasAttachments: reply.attachments && reply.attachments.length > 0,
            attachments: reply.attachments,
            ticketUrl: process.env.FRONTEND_URL + '/tickets',
            year: new Date().getFullYear()
        };

        const emailHtml = await loadTemplate('contact-reply', templateData);

        // Send email
        await transporter.sendMail({
            from: `"Support Team" <${process.env.EMAIL_USER}>`,
            to: reply.contact.email,
            subject: `Re: ${reply.contact.subject}`,
            html: emailHtml,
            attachments: emailAttachments,
            inReplyTo: reply.contact.id
        });

        // Update emailSent status
        await prisma.contactReply.update({
            where: { id: replyId },
            data: {
                emailSent: true
            }
        });

        res.json({
            success: true,
            message: "Email resent successfully"
        });

    } catch (error) {
        console.error("Error in resendReplyEmail:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resend email",
            error: error.message
        });
    }
};