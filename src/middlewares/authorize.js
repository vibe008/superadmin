const { PermissionEnum } = require("../utils/enums");

exports.authorize = (requiredPermissions = []) => {
    return (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ 
                    message: "Unauthorized - No user found" 
                });
            }

            // SuperAdmin has all permissions
            if (user.isSuperAdmin) {
                return next();
            }

            // Check if user has all required permissions
            const hasAllPermissions = requiredPermissions.every(permission => 
                user.permissions && user.permissions.includes(permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({ 
                    message: "Forbidden - Insufficient permissions",
                    required: requiredPermissions,
                    userHas: user.permissions || []
                });
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            return res.status(500).json({ 
                message: "Internal server error during authorization" 
            });
        }
    };
};