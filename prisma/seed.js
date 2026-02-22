// prisma/seed.js
const prisma = require("../src/config/db");
const bcrypt = require("bcrypt");

async function main() {
    console.log("Seeding departments, subdepartments, designations and superadmin...");

    // Department data with subdepartments and designations
    const departmentData = {
        'ADMIN': {
            'OPERATIONS_ADMIN': [
                'Operations Executive',
                'Senior Operations Executive',
                'Operations Coordinator',
                'Operations Manager',
            ],
            'ACCOUNTS_ADMIN': [
                'Accounts Executive',
                'Senior Accounts Executive',
                'Accounts Supervisor',
                'Accounts Manager',
            ],
            'LEGAL_ADMIN': [
                'Legal Executive',
                'Compliance Officer',
                'Legal Manager',
            ],
            'HR_ADMIN': [
                'HR Executive',
                'Talent Acquisition Executive',
                'HR Manager',
                'HR Business Partner',
            ],
        },
        'SUPPORT': {
            'SUPPORT_AGENT': [
                'Customer Support Executive',
                'Junior Support Executive',
                'Senior Support Executive',
            ],
            'TECH_SUPPORT': [
                'Technical Support Executive',
                'Application Support Engineer',
                'L2 Support Engineer',
                'L3 Support Engineer',
            ],
            'TASK_ASSIGNER': [
                'Support Coordinator',
                'Ticket Manager',
                'Support Operations Executive',
            ],
            'SUPPORT_LEAD_QA': [
                'Support Team Lead',
                'Customer Success Lead',
                'QA Analyst (Support)',
                'Support Manager',
            ],
        },
        'PRODUCTION': {
            'PRODUCTION_EXECUTIVE': [
                'Implementation Executive',
                'Onboarding Specialist',
                'Client Setup Executive',
            ],
            'PRODUCTION_LEAD': [
                'Implementation Lead',
                'Delivery Lead',
                'Project Lead',
            ],
            'QUALITY_CHECKER': [
                'QA Analyst',
                'Software Tester',
                'QA Engineer',
                'Senior QA Engineer',
            ],
            'DISPATCH_DELIVERY': [
                'Release Executive',
                'Deployment Engineer',
                'Delivery Coordinator',
            ],
        },
        'TECH_IT': {
            'SYSTEM_ADMIN': [
                'System Administrator',
                'Cloud Administrator',
                'DevOps Engineer',
                'Infrastructure Engineer',
            ],
            'DEVELOPER': [
                'Junior Software Developer',
                'Software Developer',
                'Senior Software Developer',
                'Full Stack Developer',
                'Backend Developer',
                'Frontend Developer',
                'Technical Lead',
                'Engineering Manager',
            ],
            'IT_SUPPORT': [
                'IT Support Executive',
                'IT Administrator',
                'IT Operations Executive',
            ],
            'HARDWARE_NETWORK_TECH': [
                'Network Engineer',
                'Network Administrator',
                'Hardware Support Engineer',
            ],
        },
        'SALES_MARKETING': {
            'SALES_EXECUTIVE': [
                'Business Development Executive (BDE)',
                'SaaS Sales Executive',
                'Inside Sales Executive',
            ],
            'SALES_MANAGER': [
                'Sales Team Lead',
                'Regional Sales Manager',
                'Business Development Manager',
                'Head of Sales',
            ],
            'TELECALLER': [
                'Lead Generation Executive',
                'Tele Sales Executive',
                'Outbound Sales Executive',
            ],
            'MARKETING_EXECUTIVE': [
                'Marketing Executive',
                'Growth Marketing Executive',
                'Performance Marketing Executive',
            ],
            'DIGITAL_SOCIAL_MEDIA': [
                'Social Media Executive',
                'Digital Marketing Executive',
                'SEO Executive',
                'Content Marketing Executive',
            ],
        },
        'FINANCE': {
            'ACCOUNTANT': [
                'Junior Accountant',
                'Senior Accountant',
                'Finance Executive',
            ],
            'BILLING_EXECUTIVE': [
                'Billing Executive',
                'Revenue Operations Executive',
                'Subscription Billing Specialist',
            ],
            'PAYMENTS_COLLECTIONS': [
                'Collections Executive',
                'Accounts Receivable Executive',
                'Payment Recovery Officer',
            ],
            'FINANCE_MANAGER': [
                'Finance Manager',
                'Finance Controller',
            ],
        },
        'INVENTORY': {
            'PURCHASE_EXECUTIVE': [
                'Procurement Executive',
                'Purchase Executive',
            ],
            'VENDOR_MANAGER': [
                'Vendor Management Executive',
                'Supplier Relationship Manager',
            ],
            'WAREHOUSE_INVENTORY': [
                'Inventory Executive',
                'Warehouse Manager',
                'Inventory Controller',
            ],
        }
    };


    const permissionData = [
        { name: "VIEW_TICKETS", label: "View Tickets", group: "TICKETS" },
        { name: "CREATE_TICKETS", label: "Create Tickets", group: "TICKETS" },
        { name: "UPDATE_TICKETS", label: "Update Tickets", group: "TICKETS" },

        { name: "VIEW_CHAT", label: "View Chat", group: "SUPPORT" },
        { name: "RESPOND_CHAT", label: "Respond Chat", group: "SUPPORT" },
        { name: "CONTACT_SUPPORT", label: "Contact Support", group: "SUPPORT" },

        { name: "VIEW_TASKS", label: "View Tasks", group: "TASKS" },
        { name: "CREATE_TASKS", label: "Create Tasks", group: "TASKS" },
        { name: "ASSIGN_TASKS", label: "Assign Tasks", group: "TASKS" },
        { name: "UPDATE_TASK_STATUS", label: "Update Task Status", group: "TASKS" },
        { name: "UPDATE_TASK", label: "Update Task", group: "TASKS" },
        { name: "DELETE_TASK", label: "Delete Task", group: "TASKS" },

        { name: "MANAGE_USERS", label: "Manage Users", group: "USERS" },
        { name: "VIEW_REPORTS", label: "View Reports", group: "REPORTS" },
        { name: "VIEW_CUSTOMERS", label: "View Customers", group: "USERS" }
    ];

    // Seed departments, subdepartments, and designations
    for (const [deptName, subDepts] of Object.entries(departmentData)) {
        console.log(`Creating department: ${deptName}`);

        // Create or find department
        const department = await prisma.department.upsert({
            where: { name: deptName },
            update: {},
            create: {
                name: deptName,
            },
        });

        for (const [subDeptName, designations] of Object.entries(subDepts)) {
            console.log(`  Creating sub-department: ${subDeptName}`);

            // Create or find sub-department
            const subDepartment = await prisma.subDepartment.upsert({
                where: {
                    name_departmentId: {
                        name: subDeptName,
                        departmentId: department.id,
                    },
                },
                update: {},
                create: {
                    name: subDeptName,
                    departmentId: department.id,
                },
            });

            // Create designations
            for (const designationTitle of designations) {
                await prisma.designation.upsert({
                    where: {
                        title_subDepartmentId: {
                            title: designationTitle,
                            subDepartmentId: subDepartment.id,
                        },
                    },
                    update: {},
                    create: {
                        title: designationTitle,
                        subDepartmentId: subDepartment.id,
                    },
                });
            }
        }
    }

    console.log("Department hierarchy seeded successfully ✅");


    for (const permission of permissionData) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission
        });
    }

    console.log("Permissions seeded ✅");
    // Seed Superadmin
    const email = "vivek@sup.com";
    const existing = await prisma.staff.findUnique({ where: { email } });

    let superadmin;

    if (!existing) {
        const password = await bcrypt.hash("Super@123", 10);

        superadmin = await prisma.staff.create({
            data: {
                name: "Super Admin",
                email,
                password,
                role: "SUPERADMIN",
                isSuperAdmin: true,
                registrationType: "PAST",
                createdAt: new Date(),
            }
        });

        console.log("Superadmin created:", superadmin.email, "password: Super@123");


    } else {
        superadmin = existing;
        console.log("Superadmin already exists:", existing.email);
    }
    const allPermissions = await prisma.permission.findMany();

    for (const permission of allPermissions) {
        await prisma.staffPermission.upsert({
            where: {
                staffId_permissionId: {
                    staffId: superadmin.id,
                    permissionId: permission.id
                }
            },
            update: {},
            create: {
                staffId: superadmin.id,
                permissionId: permission.id
            }
        });
    }

    console.log("All permissions assigned to Superadmin ✅");
    // Get counts for verification
    const deptCount = await prisma.department.count();
    const subDeptCount = await prisma.subDepartment.count();
    const desigCount = await prisma.designation.count();
    const staffCount = await prisma.staff.count();

    console.log("\n📊 Seeding Summary:");
    console.log(`✅ Departments: ${deptCount}`);
    console.log(`✅ Sub-departments: ${subDeptCount}`);
    console.log(`✅ Designations: ${desigCount}`);
    console.log(`✅ Staff members: ${staffCount}`);
    console.log("Seeding done ✅");
}

main()
    .catch(e => {
        console.error("❌ Error during seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });