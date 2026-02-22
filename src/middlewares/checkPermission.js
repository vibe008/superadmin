const prisma = require("../config/db");

exports.checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const staffId = req.user.id;

      const staff = await prisma.staff.findUnique({
        where: { id: staffId }
      });

      if (!staff) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 🔥 SuperAdmin bypass
      if (staff.isSuperAdmin) {
        return next();
      }

      if (!staff.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          message: "Access denied. Permission required: " + requiredPermission
        });
      }

      next();
    } catch (error) {
      console.error("Permission Middleware Error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};