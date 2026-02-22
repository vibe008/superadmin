const prisma = require("../config/db");

// ✅ Create Permission
exports.createPermission = async (req, res) => {
    try {
        const { name, label, group } = req.body;

        if (!name || !label || !group) {
            return res.status(400).json({
                success: false,
                message: "name, label and group are required"
            });
        }

        const existing = await prisma.permission.findUnique({
            where: { name }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Permission already exists"
            });
        }

        const permission = await prisma.permission.create({
            data: { name, label, group }
        });

        res.status(201).json({
            success: true,
            data: permission
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ Get All Permissions
exports.getAllPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { group: "asc" }
        });

        // 🔥 Grouping logic
        const grouped = permissions.reduce((acc, permission) => {
            if (!acc[permission.group]) {
                acc[permission.group] = [];
            }

            acc[permission.group].push({
                id: permission.id,
                name: permission.name,
                label: permission.label,
                createdAt: permission.createdAt
            });

            return acc;
        }, {});
        const groupedArray = Object.keys(grouped).map(group => ({
            group,
            permissions: grouped[group]
        }));

        res.json({
            success: true,
            data: groupedArray
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ Get Single Permission
exports.getPermissionById = async (req, res) => {
    try {
        const { id } = req.params;

        const permission = await prisma.permission.findUnique({
            where: { id }
        });

        if (!permission) {
            return res.status(404).json({
                success: false,
                message: "Permission not found"
            });
        }

        res.json({
            success: true,
            data: permission
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ Update Permission
exports.updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, group } = req.body;

        const permission = await prisma.permission.update({
            where: { id },
            data: {
                label,
                group
            }
        });

        res.json({
            success: true,
            data: permission
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ✅ Delete Permission
exports.deletePermission = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.permission.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Permission deleted successfully"
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};