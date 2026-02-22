const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require("../middlewares/authorize");
const { PermissionEnum } = require("../utils/enums");

// Public enums (no auth required for enums)
router.get("/enums", taskController.getTaskEnums);

// All routes below require authentication
router.use(authenticate);

// ========== TASK CRUD OPERATIONS ==========

// Get all tasks (with filters) - Requires VIEW_TASKS or SuperAdmin
router.get("/", taskController.getAllTasks);

// Get tasks by ticket ID
router.get(
    "/by-ticket/:ticketId", 
    authorize([PermissionEnum.VIEW_TASKS]), 
    taskController.getTasksByTicket
);

// Get user's assigned tasks
router.get("/my-tasks", taskController.getUserTasks);

// Get task statistics
router.get("/stats", taskController.getTaskStats);

// Create internal task - Requires CREATE_TASKS permission
router.post(
    "/",
    authorize([PermissionEnum.CREATE_TASKS]),
    taskController.createTask
);

// Convert ticket to task - Requires CREATE_TASKS permission
router.post(
    "/from-ticket/:ticketId",
    taskController.convertTicketToTask
);

// Get single task by ID
router.get("/:taskId", taskController.getTaskById);

// Update task details - Requires UPDATE_TASK permission
router.put(
    "/:taskId",
    authorize([PermissionEnum.UPDATE_TASK]),
    taskController.updateTask
);

// Delete task - Requires DELETE_TASK permission
router.delete(
    "/:taskId",
    authorize([PermissionEnum.DELETE_TASK]),
    taskController.deleteTask
);

// ========== TASK ASSIGNMENT ==========

// Assign/Reassign task - Requires ASSIGN_TASKS permission
router.post( // Changed from PUT to POST for assignment
    "/:taskId/assign",
    authorize([PermissionEnum.ASSIGN_TASKS]),
    taskController.assignTask
);

// ========== TASK STATUS & UPDATES ==========

// Update task status - Requires UPDATE_TASK_STATUS or be assignee
router.patch("/:taskId/status", taskController.updateTaskStatus);

// Get task updates/history
router.get("/:taskId/updates", taskController.getTaskUpdates);

// Add note/update to task
router.post("/:taskId/notes", taskController.addTaskNote);

// ========== BULK OPERATIONS ==========

// Bulk delete tasks - Requires DELETE_TASK permission
router.delete(
    "/bulk/delete",
    authorize([PermissionEnum.DELETE_TASK]),
    async (req, res) => {
        try {
            const { taskIds } = req.body;
            
            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ message: "Please provide an array of task IDs" });
            }

            // Delete task updates first
            await prisma.taskUpdate.deleteMany({
                where: {
                    taskId: { in: taskIds }
                }
            });

            // Delete tasks
            const deleteResult = await prisma.task.deleteMany({
                where: {
                    id: { in: taskIds }
                }
            });

            res.json({
                success: true,
                message: `Successfully deleted ${deleteResult.count} tasks`,
                count: deleteResult.count
            });
        } catch (error) {
            console.error("Error in bulk delete:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
);

// Bulk update task status - Requires UPDATE_TASK_STATUS permission
router.patch(
    "/bulk/status",
    authorize([PermissionEnum.UPDATE_TASK_STATUS]),
    async (req, res) => {
        try {
            const { taskIds, status, note } = req.body;
            const currentUser = req.user;

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ message: "Please provide an array of task IDs" });
            }

            if (!status) {
                return res.status(400).json({ message: "Please provide status to update" });
            }

            // Validate status
            const { TaskStatus } = require("../utils/enums");
            if (!Object.values(TaskStatus).includes(status)) {
                return res.status(400).json({ message: "Invalid task status" });
            }

            // Update all tasks
            const updateResult = await prisma.task.updateMany({
                where: {
                    id: { in: taskIds }
                },
                data: {
                    status,
                    completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
                    updatedAt: new Date()
                }
            });

            // Create task updates for each task
            const taskUpdates = taskIds.map(taskId => ({
                taskId,
                staffId: currentUser.id,
                previousStatus: status, // Note: we don't know previous status here
                newStatus: status,
                note: note || `Bulk status updated to ${status}`,
                attachments: []
            }));

            await prisma.taskUpdate.createMany({
                data: taskUpdates
            });

            res.json({
                success: true,
                message: `Successfully updated ${updateResult.count} tasks`,
                count: updateResult.count
            });
        } catch (error) {
            console.error("Error in bulk status update:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }
);

module.exports = router;