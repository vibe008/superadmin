const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

// All department routes require authentication
// router.use(authenticate);

// ======================
// PUBLIC ROUTES (Authenticated users)
// ======================

// Get complete hierarchy (departments -> sub-departments -> designations)
router.get("/hierarchy", departmentController.getCompleteHierarchy);

// Department routes
router.get("/departments", departmentController.getAllDepartments);
router.get("/departments/:id", departmentController.getDepartmentById);

// Sub-department routes
router.get("/sub-departments", departmentController.getAllSubDepartments);
router.get("/sub-departments/:id", departmentController.getSubDepartmentById);
router.get("/departments/:departmentId/sub-departments", departmentController.getSubDepartmentsByDepartment);

// Designation routes
router.get("/designations", departmentController.getAllDesignations);
router.get("/designations/:id", departmentController.getDesignationById);
router.get("/sub-departments/:subDepartmentId/designations", departmentController.getDesignationsBySubDepartment);

// ======================
// ADMIN ONLY ROUTES
// ======================
router.use(requireAdmin);

// Department management
router.post("/departments", departmentController.createDepartment);
router.put("/departments/:id", departmentController.updateDepartment);
router.delete("/departments/:id", departmentController.deleteDepartment);

// Sub-department management
router.post("/sub-departments", departmentController.createSubDepartment);
router.put("/sub-departments/:id", departmentController.updateSubDepartment);
router.delete("/sub-departments/:id", departmentController.deleteSubDepartment);

// Designation management
router.post("/designations", departmentController.createDesignation);
router.put("/designations/:id", departmentController.updateDesignation);
router.delete("/designations/:id", departmentController.deleteDesignation);

module.exports = router;