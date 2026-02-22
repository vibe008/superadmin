const express = require("express");
const router = express.Router();

const permissionController = require("../controllers/permission.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

// All routes protected
// router.use(authenticate);

router.post("/", permissionController.createPermission);
router.get("/", permissionController.getAllPermissions);
router.get("/:id", permissionController.getPermissionById);
router.put("/:id", permissionController.updatePermission);
router.delete("/:id", permissionController.deletePermission);

module.exports = router;