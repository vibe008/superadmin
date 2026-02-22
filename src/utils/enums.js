// enums.js
module.exports = {
    PermissionEnum: {
        VIEW_TICKETS: "VIEW_TICKETS",
        CREATE_TICKETS: "CREATE_TICKETS",
        UPDATE_TICKETS: "UPDATE_TICKETS",
        VIEW_CHAT: "VIEW_CHAT",
        RESPOND_CHAT: "RESPOND_CHAT",
        VIEW_TASKS: "VIEW_TASKS",
        CREATE_TASKS: "CREATE_TASKS",
        ASSIGN_TASKS: "ASSIGN_TASKS",
        UPDATE_TASK_STATUS: "UPDATE_TASK_STATUS",
        UPDATE_TASK: "UPDATE_TASK",
        DELETE_TASK: "DELETE_TASK",
        MANAGE_USERS: "MANAGE_USERS",
        VIEW_REPORTS: "VIEW_REPORTS",
        VIEW_CUSTOMERS: "VIEW_CUSTOMERS",
        CONTACT_SUPPORT: "CONTACT_SUPPORT"
    },
    RoleEnum: {
        SUPERADMIN: "SUPERADMIN",
        SUPPORT: "SUPPORT",
        TASK_ASSIGNER: "TASK_ASSIGNER",
        DEVELOPER: "DEVELOPER"
    },
    DepartmentEnum: {
        ADMIN: "ADMIN",
        SUPPORT: "SUPPORT",
        PRODUCTION: "PRODUCTION",
        TECH_IT: "TECH_IT",
        SALES_MARKETING: "SALES_MARKETING",
        FINANCE: "FINANCE",
        INVENTORY: "INVENTORY"
    },
    TaskPriority: {
        LOW: "LOW",
        MEDIUM: "MEDIUM",
        HIGH: "HIGH",
        URGENT: "URGENT"
    },
    TaskStatus: {
        PENDING: "PENDING",
        IN_PROGRESS: "IN_PROGRESS",
        COMPLETED: "COMPLETED",
        ON_HOLD: "ON_HOLD",
        CANCELLED: "CANCELLED",
        OVERDUE: "OVERDUE"
    },
    TaskSource: {
        INTERNAL: 'INTERNAL',
        TICKET: 'TICKET'
    }
};