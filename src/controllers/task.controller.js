const prisma = require("../config/db");
const { TaskStatus, TaskPriority, TaskSource } = require("../utils/enums");

// Helper to validate assignment - exactly one assignment type
const validateAssignment = (assignmentData) => {
    const assignmentCount = [
        assignmentData.assignedToId,
        assignmentData.assignedToDepartmentId,
        assignmentData.assignedToSubDepartmentId,
        assignmentData.assignedToDesignationId,
        assignmentData.assignedToRole
    ].filter(Boolean).length;

    if (assignmentCount !== 1) {
        throw new Error('Task must be assigned to exactly one of: staff, department, subdepartment, designation, or role');
    }
};

// Helper to get assignment description
const getAssignmentDescription = (assignment) => {
    if (assignment.assignedToId) return 'staff member';
    if (assignment.assignedToDepartmentId) return 'department';
    if (assignment.assignedToSubDepartmentId) return 'subdepartment';
    if (assignment.assignedToDesignationId) return 'designation';
    if (assignment.assignedToRole) return `role: ${assignment.assignedToRole}`;
    return 'unknown';
};

// ==================== CREATE TASK ====================
exports.createTask = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            startDate,
            dueDate, 
            priority,
            assignedToId,
            assignedToDepartmentId,
            assignedToSubDepartmentId,
            assignedToDesignationId,
            assignedToRole 
        } = req.body;
        
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Validate assignment
        try {
            validateAssignment({
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        // Verify assigned entities exist
        if (assignedToId) {
            const assignee = await prisma.staff.findUnique({ where: { id: assignedToId } });
            if (!assignee) return res.status(400).json({ message: "Assigned staff not found" });
        }

        if (assignedToDepartmentId) {
            const department = await prisma.department.findUnique({ where: { id: assignedToDepartmentId } });
            if (!department) return res.status(400).json({ message: "Department not found" });
        }

        if (assignedToSubDepartmentId) {
            const subDepartment = await prisma.subDepartment.findUnique({ where: { id: assignedToSubDepartmentId } });
            if (!subDepartment) return res.status(400).json({ message: "SubDepartment not found" });
        }

        if (assignedToDesignationId) {
            const designation = await prisma.designation.findUnique({ where: { id: assignedToDesignationId } });
            if (!designation) return res.status(400).json({ message: "Designation not found" });
        }

        // Create task
        const task = await prisma.task.create({
            data: {
                title,
                description,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || TaskPriority.MEDIUM,
                source: TaskSource.INTERNAL,
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole,
                createdById: currentUser.id,
                assignedById: currentUser.id,
                status: TaskStatus.PENDING
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } }
            }
        });

        // Create initial task update
        await prisma.taskUpdate.create({
            data: {
                taskId: task.id,
                staffId: currentUser.id,
                note: `Task created and assigned to ${getAssignmentDescription({
                    assignedToId,
                    assignedToDepartmentId,
                    assignedToSubDepartmentId,
                    assignedToDesignationId,
                    assignedToRole
                })}`,
                newStatus: TaskStatus.PENDING
            }
        });

        res.status(201).json({ message: "Task created successfully", task });

    } catch (error) {
        console.error("Error in createTask:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== CONVERT TICKET TO TASK ====================
exports.convertTicketToTask = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const {
            title,
            description,
            startDate,
            dueDate,
            priority,
            assignedToId,
            assignedToDepartmentId,
            assignedToSubDepartmentId,
            assignedToDesignationId,
            assignedToRole
        } = req.body;

        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Validate assignment
        try {
            validateAssignment({
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        // Create task from ticket
        const task = await prisma.task.create({
            data: {
                title: title || `Task for Ticket #${ticket.ticketNumber}: ${ticket.subject}`,
                description: description || ticket.description || `Task created from ticket #${ticket.ticketNumber}`,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || ticket.priority || TaskPriority.MEDIUM,
                source: TaskSource.TICKET,
                ticketId: ticket.id,
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole,
                createdById: currentUser.id,
                assignedById: currentUser.id,
                status: TaskStatus.PENDING
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } },
                ticket: { include: { chatUser: true } }
            }
        });

        // Create initial task update
        await prisma.taskUpdate.create({
            data: {
                taskId: task.id,
                staffId: currentUser.id,
                note: `Task created from Ticket #${ticket.ticketNumber} and assigned to ${getAssignmentDescription({
                    assignedToId,
                    assignedToDepartmentId,
                    assignedToSubDepartmentId,
                    assignedToDesignationId,
                    assignedToRole
                })}`,
                newStatus: TaskStatus.PENDING
            }
        });

        res.status(201).json({ message: "Task created successfully from ticket", task });

    } catch (error) {
        console.error("Error in convertTicketToTask:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== ASSIGN TASK ====================
exports.assignTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const {
            assignedToId,
            assignedToDepartmentId,
            assignedToSubDepartmentId,
            assignedToDesignationId,
            assignedToRole
        } = req.body;
        
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Validate assignment
        try {
            validateAssignment({
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        // Update task assignment
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                assignedToId,
                assignedToDepartmentId,
                assignedToSubDepartmentId,
                assignedToDesignationId,
                assignedToRole,
                assignedById: currentUser.id,
                status: TaskStatus.PENDING
            },
            include: {
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } }
            }
        });

        // Create task update record
        await prisma.taskUpdate.create({
            data: {
                taskId: taskId,
                staffId: currentUser.id,
                note: `Task reassigned to ${getAssignmentDescription({
                    assignedToId,
                    assignedToDepartmentId,
                    assignedToSubDepartmentId,
                    assignedToDesignationId,
                    assignedToRole
                })}`,
                newStatus: TaskStatus.PENDING
            }
        });

        res.json({ message: "Task assigned successfully", task: updatedTask });

    } catch (error) {
        console.error("Error in assignTask:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== UPDATE TASK STATUS ====================
exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, note, attachments } = req.body;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Validate status
        if (!Object.values(TaskStatus).includes(status)) {
            return res.status(400).json({ message: "Invalid task status" });
        }

        // Update task status
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === TaskStatus.COMPLETED ? new Date() : null
            }
        });

        // Create task update record
        await prisma.taskUpdate.create({
            data: {
                taskId: taskId,
                staffId: currentUser.id,
                previousStatus: task.status,
                newStatus: status,
                note: note || `Status updated to ${status}`,
                attachments: attachments || []
            }
        });

        res.json({ message: "Task status updated successfully", task: updatedTask });

    } catch (error) {
        console.error("Error in updateTaskStatus:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== UPDATE TASK DETAILS ====================
exports.updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title, description, priority, startDate, dueDate, status } = req.body;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Build update data
        const updateData = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority) updateData.priority = priority;
        if (startDate) updateData.startDate = new Date(startDate);
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (status) {
            if (!Object.values(TaskStatus).includes(status)) {
                return res.status(400).json({ message: "Invalid task status" });
            }
            updateData.status = status;
            updateData.completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                assignedToDesignation: { select: { id: true, title: true } }
            }
        });

        // Create task update record
        await prisma.taskUpdate.create({
            data: {
                taskId: taskId,
                staffId: currentUser.id,
                note: 'Task details updated'
            }
        });

        res.json({ message: "Task updated successfully", task: updatedTask });

    } catch (error) {
        console.error("Error in updateTask:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== DELETE TASK ====================
exports.deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Delete task updates first
        await prisma.taskUpdate.deleteMany({ where: { taskId } });

        // Delete task
        await prisma.task.delete({ where: { id: taskId } });

        res.json({ message: "Task deleted successfully" });

    } catch (error) {
        console.error("Error in deleteTask:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== GET ALL TASKS ====================
exports.getAllTasks = async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            departmentId, 
            subDepartmentId,
            designationId,
            assignedToId, 
            source,
            ticketId,
            page = 1, 
            limit = 10 
        } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (departmentId) where.assignedToDepartmentId = departmentId;
        if (subDepartmentId) where.assignedToSubDepartmentId = subDepartmentId;
        if (designationId) where.assignedToDesignationId = designationId;
        if (assignedToId) where.assignedToId = assignedToId;
        if (source) where.source = source;
        if (ticketId) where.ticketId = ticketId;

        const tasks = await prisma.task.findMany({
            where,
            skip,
            take: parseInt(limit),
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } },
                ticket: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        subject: true,
                        status: true,
                        chatUser: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.task.count({ where });

        res.json({
            success: true,
            tasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error("Error in getAllTasks:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== GET USER TASKS ====================
exports.getUserTasks = async (req, res) => {
    try {
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { source, status, priority } = req.query;

        let whereClause = {};

        if (!currentUser.isSuperAdmin) {
            whereClause = {
                OR: [
                    { assignedToId: currentUser.id },
                    { assignedToDepartmentId: currentUser.departmentId || undefined },
                    { assignedToSubDepartmentId: currentUser.subDepartmentId || undefined },
                    { assignedToDesignationId: currentUser.designationId || undefined },
                    { assignedToRole: currentUser.role }
                ]
            };
        }

        // Add filters
        if (source) whereClause.source = source;
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } },
                ticket: { select: { id: true, ticketNumber: true, subject: true } },
                taskUpdates: {
                    include: { staff: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
        });

        res.json({ success: true, count: tasks.length, tasks });

    } catch (error) {
        console.error("Error in getUserTasks:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== GET TASK BY ID ====================
exports.getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        department: { select: { name: true } },
                        subDepartment: { select: { name: true } },
                        designation: { select: { title: true } }
                    }
                },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: {
                    select: {
                        id: true,
                        title: true,
                        subDepartment: {
                            select: {
                                name: true,
                                department: { select: { name: true } }
                            }
                        }
                    }
                },
                ticket: {
                    include: {
                        chatUser: { select: { name: true, email: true } }
                    }
                },
                taskUpdates: {
                    include: { staff: { select: { id: true, name: true, email: true, role: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({ success: true, task });

    } catch (error) {
        console.error("Error in getTaskById:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== GET TASKS BY TICKET ====================
exports.getTasksByTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        // Check if ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        const tasks = await prisma.task.findMany({
            where: { ticketId },
            include: {
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                assignedTo: { select: { id: true, name: true, email: true, role: true } },
                assignedToDepartment: { select: { id: true, name: true } },
                assignedToSubDepartment: { select: { id: true, name: true } },
                assignedToDesignation: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            ticketId,
            ticketNumber: ticket.ticketNumber,
            count: tasks.length,
            tasks
        });

    } catch (error) {
        console.error("Error in getTasksByTicket:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== TASK UPDATES ====================
exports.getTaskUpdates = async (req, res) => {
    try {
        const { taskId } = req.params;

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const taskUpdates = await prisma.taskUpdate.findMany({
            where: { taskId },
            include: {
                staff: { select: { id: true, name: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, count: taskUpdates.length, updates: taskUpdates });

    } catch (error) {
        console.error("Error in getTaskUpdates:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== ADD TASK NOTE ====================
exports.addTaskNote = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { note, attachments } = req.body;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const taskUpdate = await prisma.taskUpdate.create({
            data: {
                taskId,
                staffId: currentUser.id,
                note: note || "Work update added",
                attachments: attachments || [],
                newStatus: task.status
            },
            include: {
                staff: { select: { id: true, name: true, email: true, role: true } }
            }
        });

        res.status(201).json({ message: "Note added successfully", update: taskUpdate });

    } catch (error) {
        console.error("Error in addTaskNote:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== TASK STATISTICS ====================
exports.getTaskStats = async (req, res) => {
    try {
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let whereClause = {};

        if (!currentUser.isSuperAdmin) {
            whereClause = {
                OR: [
                    { assignedToId: currentUser.id },
                    { assignedToDepartmentId: currentUser.departmentId || undefined },
                    { assignedToSubDepartmentId: currentUser.subDepartmentId || undefined },
                    { assignedToDesignationId: currentUser.designationId || undefined },
                    { assignedToRole: currentUser.role }
                ]
            };
        }

        // Get counts by status
        const tasksByStatus = await prisma.task.groupBy({
            by: ['status'],
            where: whereClause,
            _count: { status: true }
        });

        // Get counts by priority
        const tasksByPriority = await prisma.task.groupBy({
            by: ['priority'],
            where: whereClause,
            _count: { priority: true }
        });

        // Get counts by source
        const tasksBySource = await prisma.task.groupBy({
            by: ['source'],
            where: whereClause,
            _count: { source: true }
        });

        // Total tasks
        const totalTasks = await prisma.task.count({ where: whereClause });

        // Overdue tasks
        const overdueTasks = await prisma.task.count({
            where: {
                ...whereClause,
                dueDate: { lt: new Date() },
                status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] }
            }
        });

        // Tasks due today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dueToday = await prisma.task.count({
            where: {
                ...whereClause,
                dueDate: { gte: today, lt: tomorrow },
                status: { not: TaskStatus.COMPLETED }
            }
        });

        // Recent tasks
        const recentTasks = await prisma.task.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                source: true,
                dueDate: true,
                createdAt: true
            }
        });

        res.json({
            success: true,
            stats: {
                total: totalTasks,
                overdue: overdueTasks,
                dueToday: dueToday,
                byStatus: tasksByStatus.reduce((acc, curr) => {
                    acc[curr.status] = curr._count.status;
                    return acc;
                }, {}),
                byPriority: tasksByPriority.reduce((acc, curr) => {
                    acc[curr.priority] = curr._count.priority;
                    return acc;
                }, {}),
                bySource: tasksBySource.reduce((acc, curr) => {
                    acc[curr.source] = curr._count.source;
                    return acc;
                }, {}),
                recentTasks
            }
        });

    } catch (error) {
        console.error("Error in getTaskStats:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ==================== GET TASK ENUMS ====================
exports.getTaskEnums = async (req, res) => {
    try {
        res.json({
            success: true,
            enums: {
                status: Object.values(TaskStatus),
                priority: Object.values(TaskPriority),
                source: Object.values(TaskSource)
            }
        });
    } catch (error) {
        console.error("Error in getTaskEnums:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};