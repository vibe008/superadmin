const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staff.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload");

router.use(authenticate);

// ✅ Specific routes FIRST
router.get("/permissions", staffController.getAllPermissions);
router.get("/:staffId/permissions", staffController.getStaffPermission);
router.put("/:staffId/permissions", staffController.updateStaffPermissions);

// ===============================
// 📋 REGISTRATION MANAGEMENT ROUTES
// ===============================

// Get registration summary (counts of new, past, total)
router.get("/registrations/summary", staffController.getRegistrationSummary);

// Get new registrations
router.get("/registrations/new", staffController.getNewRegistrations);

// Get past registrations
router.get("/registrations/past", staffController.getPastRegistrations);

// 🔐 Only Admin After This
router.use(requireAdmin);

// ===============================
// 🆕 CREATE STAFF (With Upload)
// ===============================
router.post(
    "/",
    upload.fields([
        { name: "adharFront", maxCount: 1 },
        { name: "adharBack", maxCount: 1 },
        { name: "signature", maxCount: 1 },
        { name: "photo", maxCount: 1 },
        { name: "experienceLetter", maxCount: 1 },
        { name: "bankStatement", maxCount: 1 },
        { name: "otherDocuments", maxCount: 5 }
    ]),
    staffController.createStaff
);

router.post("/:staffId/setup-auth", staffController.setupStaffAuth);

router.put("/:staffId/auth", staffController.updateStaffAuth);

// Get auth details (role, permissions, password status)
router.get("/:staffId/auth", staffController.getStaffAuth);
// ===============================
// 📄 GET ALL STAFF
// ===============================
router.get('/', staffController.getAllStaff);

router.put(
    "/:id",
    upload.fields([
        { name: "adharFront", maxCount: 1 },
        { name: "adharBack", maxCount: 1 },
        { name: "signature", maxCount: 1 },
        { name: "photo", maxCount: 1 },
        { name: "experienceLetter", maxCount: 1 },
        { name: "bankStatement", maxCount: 1 },
        { name: "otherDocuments", maxCount: 5 }
    ]),
    staffController.updateStaff
);


router.put("/:staffId/move-to-past", staffController.moveStaffToPast);

// Move single staff back to new registrations
router.put("/:staffId/move-to-new", staffController.moveStaffToNew);

// ===============================
// 🗑️ PERMANENT DELETE
// ===============================

// Permanent delete single staff
router.delete("/:id/permanent", staffController.permanentDeleteStaff);

// ===============================
// 👤 GET SINGLE STAFF (Dynamic LAST)
// ===============================
router.get("/:id", staffController.getSingleStaff);

module.exports = router;