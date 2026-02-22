const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const { PermissionEnum } = require("../utils/enums");
const uploadToCloudinary = require("../utils/uploadToCloudinary")
exports.createStaff = async (req, res) => {
    try {
        const {
            name,
            email,
            mobileNumber,
            departmentId,
            subDepartmentId,
            designationId,
            currentAddress,
            permanentAddress,
            workExperiences,
            bankDetails,
            dateOfBirth,
            bloodGroup,
            healthIssue,
            healthIssueDescription,
            maritalStatus,
            haveVehicle,
            vehicleNumber,
            fatherName,
            motherName,
            registrationDate,
            adharNumber // Added
        } = req.body;

        // Check Email
        const existing = await prisma.staff.findUnique({
            where: { email }
        });

        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Generate Form Number
        const lastStaff = await prisma.staff.findFirst({
            orderBy: {
                formNumber: 'desc'
            },
            select: {
                formNumber: true
            }
        });

        let newFormNumber = "1";
        if (lastStaff && lastStaff.formNumber) {
            const lastNumber = parseInt(lastStaff.formNumber, 10);
            if (!isNaN(lastNumber)) {
                newFormNumber = (lastNumber + 1).toString();
            }
        }

        // Work Experience Limit
        const parsedExperiences = workExperiences
            ? JSON.parse(workExperiences)
            : [];

        if (parsedExperiences.length > 5) {
            return res.status(400).json({
                message: "Maximum 5 work experiences allowed"
            });
        }

        const files = req.files || {};

        // Upload Functions
        const uploadSingle = async (file, folder) => {
            if (!file) return null;
            const result = await uploadToCloudinary(file[0].buffer, folder);
            return result.secure_url;
        };

        const uploadMultiple = async (fileArray, folder) => {
            if (!fileArray) return [];
            const uploads = fileArray.map(file =>
                uploadToCloudinary(file.buffer, folder)
            );
            const results = await Promise.all(uploads);
            return results.map(r => r.secure_url);
        };

        // Upload Documents
        const adharFront = await uploadSingle(files.adharFront, "staff/adhar");
        const adharBack = await uploadSingle(files.adharBack, "staff/adhar");
        const signature = await uploadSingle(files.signature, "staff/signature");
        const photo = await uploadSingle(files.photo, "staff/photo");
        const experienceLetter = await uploadSingle(files.experienceLetter, "staff/experience");
        const bankStatement = await uploadSingle(files.bankStatement, "staff/bank");
        const otherDocuments = await uploadMultiple(files.otherDocuments, "staff/other");

        // Parse Addresses
        const parsedCurrentAddress = currentAddress ? JSON.parse(currentAddress) : {};
        const parsedPermanentAddress = permanentAddress ? JSON.parse(permanentAddress) : {};

        // Parse Bank Details
        const parsedBankDetails = bankDetails ? JSON.parse(bankDetails) : null;

        // Create Staff
        const staff = await prisma.staff.create({
            data: {
                name,
                email,
                mobileNumber,
                adharNumber,

                // Use connect for relations
                department: departmentId ? {
                    connect: { id: departmentId }
                } : undefined,

                subDepartment: subDepartmentId ? {
                    connect: { id: subDepartmentId }
                } : undefined,

                designation: designationId ? {
                    connect: { id: designationId }
                } : undefined,

                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                bloodGroup,
                healthIssue: healthIssue === 'true' || healthIssue === true,
                healthIssueDescription,
                maritalStatus,
                haveVehicle: haveVehicle === 'true' || haveVehicle === true,
                vehicleNumber,
                fatherName,
                motherName,
                formNumber: newFormNumber,
                registrationDate: registrationDate ? new Date(registrationDate) : new Date(),
                registrationType: "NEW",
                password: null,
                role: null,
                isSuperAdmin: false,

                addresses: {
                    create: [
                        {
                            type: "CURRENT",
                            pincode: parsedCurrentAddress.pincode,
                            country: parsedCurrentAddress.country,
                            state: parsedCurrentAddress.state,
                            district: parsedCurrentAddress.district,
                            fullAddress: parsedCurrentAddress.fullAddress
                        },
                        {
                            type: "PERMANENT",
                            pincode: parsedPermanentAddress.pincode,
                            country: parsedPermanentAddress.country,
                            state: parsedPermanentAddress.state,
                            district: parsedPermanentAddress.district,
                            fullAddress: parsedPermanentAddress.fullAddress
                        }
                    ]
                },

                ...(parsedExperiences.length > 0 && {
                    experiences: {
                        create: parsedExperiences.map(exp => ({
                            companyName: exp.companyName,
                            contactNumber: exp.contactNumber,
                            designation: exp.designation,
                            startDate: exp.startDate ? new Date(exp.startDate) : null,
                            endDate: exp.endDate ? new Date(exp.endDate) : null
                        }))
                    }
                }),

                ...(parsedBankDetails && {
                    bankDetails: {
                        create: {
                            bankName: parsedBankDetails.bankName,
                            accountHolderName: parsedBankDetails.accountHolderName,
                            accountNumber: parsedBankDetails.accountNumber,
                            ifscCode: parsedBankDetails.ifscCode
                        }
                    }
                }),

                documents: {
                    create: {
                        adharFront,
                        adharBack,
                        signature,
                        photo,
                        experienceLetter,
                        bankStatement,
                        otherDocuments: otherDocuments.length > 0 ? JSON.stringify(otherDocuments) : null
                    }
                }
            },
            include: {
                addresses: true,
                experiences: true,
                bankDetails: true,
                documents: true,
                department: true,
                subDepartment: true,
                designation: true
            }
        });

        const { password, ...staffWithoutPassword } = staff;
        console.log("created staff", staffWithoutPassword)
        res.status(201).json({
            message: "Employee created successfully",
            staff: staffWithoutPassword
        });

    } catch (error) {
        console.error("Create Staff Error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.setupStaffAuth = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { password, role, permissions, isSuperAdmin } = req.body;
        const currentUser = req.user;

        if (!currentUser || !currentUser.isSuperAdmin) {
            return res.status(403).json({
                message: "Only SuperAdmin can setup authentication"
            });
        }

        if (!password || !role) {
            return res.status(400).json({
                message: "Password and role are required"
            });
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: { staffPermissions: true }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (staff.password || staff.role || staff.staffPermissions.length > 0) {
            return res.status(400).json({
                message: "Staff authentication already setup"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let finalPermissionIds = [];

        if (isSuperAdmin) {
            const allPermissions = await prisma.permission.findMany({
                select: { id: true }
            });
            finalPermissionIds = allPermissions.map(p => p.id);
        } else {
            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    message: "Permissions must be an array"
                });
            }

            const dbPermissions = await prisma.permission.findMany({
                where: { id: { in: permissions } },
                select: { id: true }
            });

            if (dbPermissions.length !== permissions.length) {
                return res.status(400).json({
                    message: "Some permissions are invalid"
                });
            }

            finalPermissionIds = dbPermissions.map(p => p.id);
        }

        const updatedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: {
                password: hashedPassword,
                role,
                isSuperAdmin: isSuperAdmin || false,
                staffPermissions: {
                    create: finalPermissionIds.map(permissionId => ({
                        permission: {
                            connect: { id: permissionId }
                        }
                    }))
                }
            },
            include: {
                staffPermissions: {
                    include: { permission: true }
                },
                department: true,
                subDepartment: true,
                designation: true
            }
        });

        await prisma.staffSession.create({
            data: {
                staffId: staff.id,
                status: 'AUTH_SETUP_COMPLETED',
                loginTime: new Date(),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: "Authentication setup completed",
            staff: updatedStaff
        });

    } catch (error) {
        console.error("Setup Staff Auth Error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.updateStaffAuth = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { password, role, permissions, isSuperAdmin } = req.body;
        const currentUser = req.user;

        if (!currentUser || !currentUser.isSuperAdmin) {
            return res.status(403).json({
                message: "Only SuperAdmin can update authentication"
            });
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        const updateData = {};

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (role) {
            updateData.role = role;
        }

        if (isSuperAdmin !== undefined) {
            updateData.isSuperAdmin = isSuperAdmin;
        }

        // 🔥 Permission Update Logic
        if (permissions !== undefined) {

            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    message: "Permissions must be an array"
                });
            }

            const dbPermissions = await prisma.permission.findMany({
                where: { id: { in: permissions } },
                select: { id: true }
            });

            if (dbPermissions.length !== permissions.length) {
                return res.status(400).json({
                    message: "Some permissions are invalid"
                });
            }

            // Delete old permissions
            await prisma.staffPermission.deleteMany({
                where: { staffId }
            });

            updateData.staffPermissions = {
                create: dbPermissions.map(p => ({
                    permission: {
                        connect: { id: p.id }
                    }
                }))
            };
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "No fields provided for update"
            });
        }

        const updatedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: updateData,
            include: {
                staffPermissions: {
                    include: { permission: true }
                },
                department: true,
                subDepartment: true,
                designation: true
            }
        });

        await prisma.staffSession.create({
            data: {
                staffId: staff.id,
                status: 'AUTH_UPDATED_BY_SUPERADMIN',
                loginTime: new Date(),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: "Authentication updated successfully",
            staff: updatedStaff
        });

    } catch (error) {
        console.error("Update Staff Auth Error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.getStaffAuth = async (req, res) => {
    try {
        const { staffId } = req.params;
        const currentUser = req.user;

        if (!currentUser || !currentUser.isSuperAdmin) {
            return res.status(403).json({
                message: "Only SuperAdmin can view authentication details"
            });
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: {
                staffPermissions: {
                    include: { permission: true }
                },
                department: true,
                subDepartment: true,
                designation: true,
                sessions: {
                    orderBy: { loginTime: 'desc' },
                    take: 5
                },
                _count: {
                    select: {
                        sessions: true,
                        assignedTasks: true,
                        createdTasks: true,
                        assignedTickets: true,
                        createdTickets: true
                    }
                }
            }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        const permissionList = staff.staffPermissions.map(
            sp => sp.permission
        );

        res.json({
            success: true,
            data: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                isSuperAdmin: staff.isSuperAdmin,
                permissions: permissionList,
                authStatus: {
                    hasPassword: !!staff.password,
                    hasRole: !!staff.role,
                    hasPermissions: permissionList.length > 0,
                    setupCompleted:
                        !!staff.password &&
                        !!staff.role &&
                        permissionList.length > 0
                },
                activity: {
                    totalSessions: staff._count.sessions,
                    totalTasksAssigned: staff._count.assignedTasks,
                    totalTasksCreated: staff._count.createdTasks,
                    totalTicketsAssigned: staff._count.assignedTickets,
                    totalTicketsCreated: staff._count.createdTickets
                },
                recentSessions: staff.sessions
            }
        });

    } catch (error) {
        console.error("Get Staff Auth Error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.getAllStaff = async (req, res) => {
    try {

        // Get current user from request (assuming middleware adds user)
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let whereClause = {};

        // If user is ADMIN (not SUPERADMIN), exclude SUPERADMIN from results
        if (currentUser.role === "ADMIN" || currentUser.isSuperAdmin === false) {
            whereClause = {
                isSuperAdmin: false,
                role: { not: "SUPERADMIN" }
            };
        }
        const staff = await prisma.staff.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                departmentId: true,
                subDepartmentId: true,
                isSuperAdmin: true,
                createdAt: true,
                // Include department and subdepartment names if needed
                department: {
                    select: {
                        name: true
                    }
                },
                subDepartment: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Transform the response to flatten department/subdepartment names
        const transformedStaff = staff.map(staffMember => ({
            ...staffMember,
            departmentName: staffMember.department?.name || null,
            subDepartmentName: staffMember.subDepartment?.name || null,
            department: undefined, // Remove nested object
            subDepartment: undefined // Remove nested object
        }));

        console.log(`Found ${transformedStaff.length} staff members`);
        res.json(transformedStaff);

    } catch (error) {
        console.error("Error in getAllStaff:", error);
        res.status(500).json({
            message: "Server error in getAllStaff",
            error: error.message,
            code: error.code
        });
    }
};

exports.getSingleStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        // First get main staff details
        const staff = await prisma.staff.findUnique({
            where: { id },
            select: {
                // Basic Info
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                dateOfBirth: true,
                bloodGroup: true,
                healthIssue: true,
                healthIssueDescription: true,
                maritalStatus: true,
                haveVehicle: true,
                vehicleNumber: true,
                fatherName: true,
                motherName: true,
                adharNumber: true, // ADD THIS - it was missing

                // HR Fields
                formNumber: true,
                registrationDate: true,

                // Auth Fields
                role: true,
                isSuperAdmin: true,
                password: true,

                // Department Relations
                departmentId: true,
                subDepartmentId: true,
                designationId: true,

                // Timestamps
                createdAt: true,

                // Relations
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subDepartment: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                // ADD THIS - include designation relation
                designation: {
                    select: {
                        id: true,
                        title: true,
                        subDepartmentId: true
                    }
                },
                addresses: {
                    select: {
                        id: true,
                        type: true,
                        pincode: true,
                        country: true,
                        state: true,
                        district: true,
                        fullAddress: true
                    }
                },
                experiences: {
                    select: {
                        id: true,
                        companyName: true,
                        contactNumber: true,
                        designation: true,
                        startDate: true,
                        endDate: true
                    },
                    orderBy: {
                        startDate: 'desc'
                    }
                },
                bankDetails: {
                    select: {
                        id: true,
                        bankName: true,
                        accountHolderName: true,
                        accountNumber: true,
                        ifscCode: true
                    }
                },
                documents: {
                    select: {
                        id: true,
                        adharFront: true,
                        adharBack: true,
                        signature: true,
                        photo: true,
                        experienceLetter: true,
                        bankStatement: true,
                        otherDocuments: true
                    }
                }
            }
        });

        console.log("staff", staff); // This should now show adharNumber and designation

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Check if current user is allowed to view this staff member
        if ((currentUser.role === "ADMIN" || !currentUser.isSuperAdmin) && staff.isSuperAdmin) {
            return res.status(403).json({
                message: "Access denied. Admins cannot view super admin details"
            });
        }

        // Get counts separately
        const [ticketCounts, taskCounts, sessionCounts] = await Promise.all([
            prisma.ticket.aggregate({
                where: { createdById: id },
                _count: true
            }),
            prisma.task.aggregate({
                where: { assignedToId: id },
                _count: true
            }),
            prisma.staffSession.count({
                where: { staffId: id }
            })
        ]);

        // Remove password from response
        const { password, ...staffWithoutPassword } = staff;

        // Add computed fields
        const staffWithComputed = {
            ...staffWithoutPassword,
            departmentName: staff.department?.name,
            subDepartmentName: staff.subDepartment?.name,
            designationTitle: staff.designation?.title, // Add this for easy access

            // Add statistics
            stats: {
                totalTicketsCreated: ticketCounts._count || 0,
                totalTasksAssigned: taskCounts._count || 0,
                totalSessions: sessionCounts || 0
            },

            // Add setup status
            setupStatus: {
                hasPassword: !!staff.password,
                hasRole: !!staff.role,
                hasPermissions: staff.permissions && staff.permissions.length > 0,
                hasDocuments: !!staff.documents,
                hasBankDetails: !!staff.bankDetails,
                hasAddresses: staff.addresses && staff.addresses.length > 0,
                hasAdharNumber: !!staff.adharNumber, // Add this
                isFullySetup: !!(staff.password && staff.role && staff.permissions?.length > 0)
            }
        };

        res.json({
            message: "Staff details retrieved successfully",
            staff: staffWithComputed
        });

    } catch (error) {
        console.error("Error in getSingleStaff:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            mobileNumber,
            departmentId,
            subDepartmentId,
            designationId, // Changed from designation to designationId
            currentAddress,
            permanentAddress,
            workExperiences,
            bankDetails,
            dateOfBirth,
            bloodGroup,
            healthIssue,
            healthIssueDescription,
            maritalStatus,
            haveVehicle,
            vehicleNumber,
            fatherName,
            motherName,
            registrationDate,
            formNumber,
            adharNumber // Added missing field
        } = req.body;

        // Check if staff exists
        const existingStaff = await prisma.staff.findUnique({
            where: { id },
            include: {
                addresses: true,
                experiences: true,
                bankDetails: true,
                documents: true
            }
        });

        if (!existingStaff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== existingStaff.email) {
            const emailExists = await prisma.staff.findUnique({
                where: { email }
            });
            if (emailExists) {
                return res.status(400).json({ message: "Email already exists" });
            }
        }

        const files = req.files || {};

        // Upload Functions
        const uploadSingle = async (file, folder) => {
            if (!file) return null;
            const result = await uploadToCloudinary(file[0].buffer, folder);
            return result.secure_url;
        };

        const uploadMultiple = async (fileArray, folder) => {
            if (!fileArray) return [];
            const uploads = fileArray.map(file =>
                uploadToCloudinary(file.buffer, folder)
            );
            const results = await Promise.all(uploads);
            return results.map(r => r.secure_url);
        };

        // Upload new documents if provided
        const adharFront = files.adharFront ? await uploadSingle(files.adharFront, "staff/adhar") : existingStaff.documents?.adharFront;
        const adharBack = files.adharBack ? await uploadSingle(files.adharBack, "staff/adhar") : existingStaff.documents?.adharBack;
        const signature = files.signature ? await uploadSingle(files.signature, "staff/signature") : existingStaff.documents?.signature;
        const photo = files.photo ? await uploadSingle(files.photo, "staff/photo") : existingStaff.documents?.photo;
        const experienceLetter = files.experienceLetter ? await uploadSingle(files.experienceLetter, "staff/experience") : existingStaff.documents?.experienceLetter;
        const bankStatement = files.bankStatement ? await uploadSingle(files.bankStatement, "staff/bank") : existingStaff.documents?.bankStatement;
        const otherDocuments = files.otherDocuments ? await uploadMultiple(files.otherDocuments, "staff/other") : existingStaff.documents?.otherDocuments;

        // Parse data if provided
        const parsedCurrentAddress = currentAddress ? JSON.parse(currentAddress) : null;
        const parsedPermanentAddress = permanentAddress ? JSON.parse(permanentAddress) : null;
        const parsedExperiences = workExperiences ? JSON.parse(workExperiences) : null;
        const parsedBankDetails = bankDetails ? JSON.parse(bankDetails) : null;

        // Update staff
        const updatedStaff = await prisma.staff.update({
            where: { id },
            data: {
                name: name || existingStaff.name,
                email: email || existingStaff.email,
                mobileNumber: mobileNumber || existingStaff.mobileNumber,
                adharNumber: adharNumber || existingStaff.adharNumber,

                // Use the relation fields correctly
                department: departmentId ? {
                    connect: { id: departmentId }
                } : undefined,

                subDepartment: subDepartmentId ? {
                    connect: { id: subDepartmentId }
                } : undefined,

                designation: designationId ? {
                    connect: { id: designationId }
                } : undefined,

                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existingStaff.dateOfBirth,
                bloodGroup: bloodGroup || existingStaff.bloodGroup,
                healthIssue: healthIssue !== undefined ? healthIssue === 'true' || healthIssue === true : existingStaff.healthIssue,
                healthIssueDescription: healthIssueDescription || existingStaff.healthIssueDescription,
                maritalStatus: maritalStatus || existingStaff.maritalStatus,
                haveVehicle: haveVehicle !== undefined ? haveVehicle === 'true' || haveVehicle === true : existingStaff.haveVehicle,
                vehicleNumber: vehicleNumber || existingStaff.vehicleNumber,
                fatherName: fatherName || existingStaff.fatherName,
                motherName: motherName || existingStaff.motherName,
                formNumber: formNumber || existingStaff.formNumber,
                registrationDate: registrationDate ? new Date(registrationDate) : existingStaff.registrationDate,

                // Update addresses if provided
                ...(parsedCurrentAddress && {
                    addresses: {
                        updateMany: [
                            {
                                where: { type: "CURRENT" },
                                data: {
                                    pincode: parsedCurrentAddress.pincode,
                                    country: parsedCurrentAddress.country,
                                    state: parsedCurrentAddress.state,
                                    district: parsedCurrentAddress.district,
                                    fullAddress: parsedCurrentAddress.fullAddress
                                }
                            }
                        ]
                    }
                }),

                ...(parsedPermanentAddress && {
                    addresses: {
                        updateMany: [
                            {
                                where: { type: "PERMANENT" },
                                data: {
                                    pincode: parsedPermanentAddress.pincode,
                                    country: parsedPermanentAddress.country,
                                    state: parsedPermanentAddress.state,
                                    district: parsedPermanentAddress.district,
                                    fullAddress: parsedPermanentAddress.fullAddress
                                }
                            }
                        ]
                    }
                }),

                // Update experiences (delete old and create new)
                ...(parsedExperiences && {
                    experiences: {
                        deleteMany: {},
                        create: parsedExperiences.map(exp => ({
                            companyName: exp.companyName,
                            contactNumber: exp.contactNumber,
                            designation: exp.designation,
                            startDate: exp.startDate ? new Date(exp.startDate) : null,
                            endDate: exp.endDate ? new Date(exp.endDate) : null
                        }))
                    }
                }),

                // Update bank details
                ...(parsedBankDetails && {
                    bankDetails: {
                        upsert: {
                            create: {
                                bankName: parsedBankDetails.bankName,
                                accountHolderName: parsedBankDetails.accountHolderName,
                                accountNumber: parsedBankDetails.accountNumber,
                                ifscCode: parsedBankDetails.ifscCode
                            },
                            update: {
                                bankName: parsedBankDetails.bankName,
                                accountHolderName: parsedBankDetails.accountHolderName,
                                accountNumber: parsedBankDetails.accountNumber,
                                ifscCode: parsedBankDetails.ifscCode
                            }
                        }
                    }
                }),

                // Update documents
                documents: {
                    upsert: {
                        create: {
                            adharFront,
                            adharBack,
                            signature,
                            photo,
                            experienceLetter,
                            bankStatement,
                            otherDocuments: otherDocuments ? JSON.stringify(otherDocuments) : null
                        },
                        update: {
                            adharFront,
                            adharBack,
                            signature,
                            photo,
                            experienceLetter,
                            bankStatement,
                            otherDocuments: otherDocuments ? JSON.stringify(otherDocuments) : null
                        }
                    }
                }
            },
            include: {
                addresses: true,
                experiences: true,
                bankDetails: true,
                documents: true,
                department: true,
                subDepartment: true,
                designation: true // Include designation in response
            }
        });

        const { password, ...staffWithoutPassword } = updatedStaff;
        console.log("staffWithoutPassword", staffWithoutPassword)
        res.json({
            message: "Staff updated successfully",
            staff: staffWithoutPassword
        });

    } catch (error) {
        console.error("Update Staff Error:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.moveStaffToPast = async (req, res) => {
    try {
        const { staffId } = req.params;

        // Check if staff exists
        const staff = await prisma.staff.findUnique({
            where: { id: staffId }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Check if already in past
        if (staff.registrationType === "PAST") {
            return res.status(400).json({
                message: "Staff is already in past registrations"
            });
        }

        // Move to past
        const updatedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: {
                registrationType: "PAST",
                movedToPastAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                formNumber: true,
                registrationType: true,
                movedToPastAt: true,
                department: {
                    select: { name: true }
                },
                subDepartment: {
                    select: { name: true }
                }
            }
        });

        res.json({
            success: true,
            message: "Staff moved to past registrations successfully",
            staff: updatedStaff
        });

    } catch (error) {
        console.error("Move to Past Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.moveStaffToNew = async (req, res) => {
    try {
        const { staffId } = req.params;

        const staff = await prisma.staff.findUnique({
            where: { id: staffId }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (staff.registrationType === "NEW") {
            return res.status(400).json({
                message: "Staff is already in new registrations"
            });
        }

        const updatedStaff = await prisma.staff.update({
            where: { id: staffId },
            data: {
                registrationType: "NEW",
                movedToPastAt: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                formNumber: true,
                registrationType: true,
                department: {
                    select: { name: true }
                },
                subDepartment: {
                    select: { name: true }
                }
            }
        });

        res.json({
            success: true,
            message: "Staff moved back to new registrations",
            staff: updatedStaff
        });

    } catch (error) {
        console.error("Move to New Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.permanentDeleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        console.log("Permanent Delete Request:", {
            staffId: id,
            requestedBy: currentUser?.id
        });

        // Check if staff exists - include ALL relations
        const staff = await prisma.staff.findUnique({
            where: { id: id },
            include: {
                addresses: true,
                experiences: true,
                bankDetails: true,
                documents: true,
                sessions: true,
                createdTickets: true,
                assignedTickets: true,
                createdTasks: true,
                assignedTasks: true,
                assignedByTasks: true, // ADD THIS - it was missing
                contactSupports: true
            }
        });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Prevent self-deletion
        if (currentUser.id === id) {
            return res.status(400).json({
                message: "Cannot delete your own account"
            });
        }

        // Check if staff has any active assignments
        if (staff.assignedTickets?.length > 0 || staff.assignedTasks?.length > 0) {
            return res.status(400).json({
                message: "Cannot delete staff with active tickets or tasks. Please reassign them first."
            });
        }

        // Delete related records first
        console.log("Deleting staff addresses...");
        await prisma.staffAddress.deleteMany({ where: { staffId: id } });

        console.log("Deleting work experiences...");
        await prisma.workExperience.deleteMany({ where: { staffId: id } });

        console.log("Deleting bank details...");
        await prisma.bankDetail.deleteMany({ where: { staffId: id } });

        console.log("Deleting staff documents...");
        await prisma.staffDocument.deleteMany({ where: { staffId: id } });

        console.log("Deleting staff sessions...");
        await prisma.staffSession.deleteMany({ where: { staffId: id } });

        // Handle tickets - check if they exist first
        if (staff.createdTickets && staff.createdTickets.length > 0) {
            console.log(`Found ${staff.createdTickets.length} created tickets - deleting them`);
            await prisma.ticket.deleteMany({
                where: { createdById: id }
            });
        }

        if (staff.assignedTickets && staff.assignedTickets.length > 0) {
            console.log(`Found ${staff.assignedTickets.length} assigned tickets - deleting them`);
            await prisma.ticket.deleteMany({
                where: { assignedToId: id }
            });
        }

        // Handle tasks - check each relation separately
        if (staff.createdTasks && staff.createdTasks.length > 0) {
            console.log(`Found ${staff.createdTasks.length} created tasks - deleting them`);
            await prisma.task.deleteMany({
                where: { createdById: id }
            });
        }

        if (staff.assignedTasks && staff.assignedTasks.length > 0) {
            console.log(`Found ${staff.assignedTasks.length} assigned tasks - deleting them`);
            await prisma.task.deleteMany({
                where: { assignedToId: id }
            });
        }

        if (staff.assignedByTasks && staff.assignedByTasks.length > 0) {
            console.log(`Found ${staff.assignedByTasks.length} assigned-by tasks - deleting them`);
            await prisma.task.deleteMany({
                where: { assignedById: id }
            });
        }

        // Handle contact supports
        if (staff.contactSupports && staff.contactSupports.length > 0) {
            console.log(`Found ${staff.contactSupports.length} contact supports - updating them`);
            await prisma.contactSupport.updateMany({
                where: { convertedById: id },
                data: { convertedById: null }
            });
        }

        console.log("Deleting staff...");
        await prisma.staff.delete({ where: { id: id } });

        res.json({
            success: true,
            message: "Staff permanently deleted successfully"
        });

    } catch (error) {
        console.error("Permanent Delete Error:", error);

        if (error.code) {
            console.error("Error code:", error.code);
        }
        if (error.meta) {
            console.error("Error meta:", error.meta);
        }

        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getNewRegistrations = async (req, res) => {
    try {
        const currentUser = req.user;

        let whereClause = {
            registrationType: "NEW"
        };

        // Filter based on user permissions
        if (currentUser.role === "ADMIN" || !currentUser.isSuperAdmin) {
            whereClause.isSuperAdmin = false;
        }

        const newRegistrations = await prisma.staff.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                formNumber: true,
                role: true,
                designation: true,
                registrationType: true,
                createdAt: true,
                password: true,
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subDepartment: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Process the data
        const processedRegistrations = newRegistrations.map(staff => ({
            id: staff.id,
            name: staff.name,
            email: staff.email,
            mobileNumber: staff.mobileNumber,
            formNumber: staff.formNumber,
            role: staff.role,
            designation: staff.designation,
            registrationType: staff.registrationType,
            registeredAt: staff.createdAt,
            status: staff.password ? 'active' : 'pending_setup',
            departmentId: staff.department?.id,
            departmentName: staff.department?.name,
            subDepartmentId: staff.subDepartment?.id,
            subDepartmentName: staff.subDepartment?.name
        }));

        res.json({
            success: true,
            count: processedRegistrations.length,
            registrations: processedRegistrations
        });

    } catch (error) {
        console.error("Get New Registrations Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// ======================
// GET PAST REGISTRATIONS
// ======================

exports.getPastRegistrations = async (req, res) => {
    try {
        const currentUser = req.user;

        let whereClause = {
            registrationType: "PAST"
        };

        // Filter based on user permissions
        if (currentUser.role === "ADMIN" || !currentUser.isSuperAdmin) {
            whereClause.isSuperAdmin = false;
        }

        const pastRegistrations = await prisma.staff.findMany({
            where: whereClause,
            orderBy: { movedToPastAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                formNumber: true,
                role: true,
                designation: true,
                registrationType: true,
                createdAt: true,
                movedToPastAt: true,
                password: true,
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subDepartment: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Process the data
        const processedRegistrations = pastRegistrations.map(staff => ({
            id: staff.id,
            name: staff.name,
            email: staff.email,
            mobileNumber: staff.mobileNumber,
            formNumber: staff.formNumber,
            role: staff.role,
            designation: staff.designation,
            registrationType: staff.registrationType,
            registeredAt: staff.createdAt,
            movedToPastAt: staff.movedToPastAt,
            status: staff.password ? 'active' : 'pending_setup',
            departmentId: staff.department?.id,
            departmentName: staff.department?.name,
            subDepartmentId: staff.subDepartment?.id,
            subDepartmentName: staff.subDepartment?.name
        }));

        res.json({
            success: true,
            count: processedRegistrations.length,
            registrations: processedRegistrations
        });

    } catch (error) {
        console.error("Get Past Registrations Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// ======================
// GET REGISTRATION SUMMARY
// ======================

exports.getRegistrationSummary = async (req, res) => {
    try {
        const currentUser = req.user;

        let whereClause = {};
        if (currentUser.role === "ADMIN" || !currentUser.isSuperAdmin) {
            whereClause.isSuperAdmin = false;
        }

        const [newCount, pastCount, totalCount] = await Promise.all([
            prisma.staff.count({
                where: {
                    ...whereClause,
                    registrationType: "NEW"
                }
            }),
            prisma.staff.count({
                where: {
                    ...whereClause,
                    registrationType: "PAST"
                }
            }),
            prisma.staff.count({
                where: whereClause
            })
        ]);

        res.json({
            success: true,
            summary: {
                new: newCount,
                past: pastCount,
                total: totalCount
            }
        });

    } catch (error) {
        console.error("Get Registration Summary Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};



exports.updateStaffPermissions = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { permissions } = req.body;

        // ✅ Validate enum values
        const validPermissions = Object.values(PermissionEnum);

        const invalid = permissions.filter(
            (p) => !validPermissions.includes(p)
        );

        if (invalid.length > 0) {
            return res.status(400).json({
                message: "Invalid permissions",
                invalid
            });
        }

        const updated = await prisma.staff.update({
            where: { id: staffId },
            data: { permissions }
        });

        res.json({
            message: "Permissions updated successfully",
            updated
        });

    } catch (error) {
        console.error("Update Permission Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getAllPermissions = async (req, res) => {
    try {
        console.log("PermissionEnum from enums.js:", PermissionEnum);

        const permissions = Object.values(PermissionEnum);
        console.log("Permissions:", permissions);

        res.json(permissions.sort());

    } catch (error) {
        console.error("Permission Fetch Error:", error);
        res.status(500).json({
            message: "Failed to fetch permissions",
            error: error.message
        });
    }
};

exports.getStaffPermission = async (req, res) => {
    try {
        const { staffId } = req.params;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Fetch staff member with their permissions
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isSuperAdmin: true,
                department: {
                    select: {
                        name: true
                    }
                },
                subDepartment: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        // Permission checks based on user role
        const isSuperAdmin = currentUser.isSuperAdmin === true;
        const isAdmin = currentUser.role === "ADMIN";
        const isOwnProfile = currentUser.id === staffId;

        // Check if user has permission to view this staff's permissions
        if (!isSuperAdmin) {
            // Super Admin can view anyone's permissions
            if (isAdmin) {
                // Admin can view:
                // 1. Their own permissions
                // 2. Non-super admin staff permissions
                if (!isOwnProfile && staff.isSuperAdmin) {
                    return res.status(403).json({
                        success: false,
                        message: "Admins cannot view super admin permissions"
                    });
                }
            } else {
                // Regular staff can only view their own permissions
                if (!isOwnProfile) {
                    return res.status(403).json({
                        success: false,
                        message: "You can only view your own permissions"
                    });
                }
            }
        }

        // If staff is super admin, they have all permissions
        let permissionsList = staff.permissions;
        if (staff.isSuperAdmin) {
            // You can either return all permissions or a special indicator
            permissionsList = ["ALL_PERMISSIONS"];
        }

        // Format the response
        res.json({
            success: true,
            data: {
                staffId: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                isSuperAdmin: staff.isSuperAdmin,
                department: staff.department?.name || null,
                subDepartment: staff.subDepartment?.name || null,
                permissions: permissionsList,
                permissionsCount: permissionsList.length
            }
        });

    } catch (error) {
        console.error("Error in getStaffPermission:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch staff permissions",
            error: error.message
        });
    }
};