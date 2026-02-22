const prisma = require("../config/db");

// ======================
// DEPARTMENT CRUD
// ======================

// Get all departments with their sub-departments and designations
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        subDepartments: {
          include: {
            designations: {
              orderBy: {
                title: 'asc'
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: departments
    });

  } catch (error) {
    console.error("Get All Departments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get single department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        subDepartments: {
          include: {
            designations: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.json({
      success: true,
      data: department
    });

  } catch (error) {
    console.error("Get Department By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Create new department
exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    // Check if department already exists
    const existing = await prisma.department.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Department with this name already exists"
      });
    }

    const department = await prisma.department.create({
      data: {
        name
      }
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department
    });

  } catch (error) {
    console.error("Create Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // If name is being changed, check if new name already exists
    if (name && name !== department.name) {
      const existing = await prisma.department.findUnique({
        where: { name }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Department with this name already exists"
        });
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        name: name || department.name
      }
    });

    res.json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment
    });

  } catch (error) {
    console.error("Update Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department has staff assigned
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        staff: true,
        subDepartments: {
          include: {
            staff: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if any staff in department or sub-departments
    const hasStaff = department.staff.length > 0 || 
                     department.subDepartments.some(sd => sd.staff.length > 0);

    if (hasStaff) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete department with assigned staff. Please reassign staff first."
      });
    }

    await prisma.department.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Department deleted successfully"
    });

  } catch (error) {
    console.error("Delete Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ======================
// SUB-DEPARTMENT CRUD
// ======================

// Get all sub-departments
exports.getAllSubDepartments = async (req, res) => {
  try {
    const subDepartments = await prisma.subDepartment.findMany({
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        designations: {
          orderBy: {
            title: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: subDepartments
    });

  } catch (error) {
    console.error("Get All Sub-Departments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get sub-departments by department
exports.getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const subDepartments = await prisma.subDepartment.findMany({
      where: { departmentId },
      include: {
        designations: {
          orderBy: {
            title: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: subDepartments
    });

  } catch (error) {
    console.error("Get Sub-Departments By Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get single sub-department
exports.getSubDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        designations: {
          orderBy: {
            title: 'asc'
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true
          }
        }
      }
    });

    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "Sub-department not found"
      });
    }

    res.json({
      success: true,
      data: subDepartment
    });

  } catch (error) {
    console.error("Get Sub-Department By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Create sub-department
exports.createSubDepartment = async (req, res) => {
  try {
    const { name, departmentId } = req.body;

    if (!name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Name and departmentId are required"
      });
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if sub-department already exists in this department
    const existing = await prisma.subDepartment.findUnique({
      where: {
        name_departmentId: {
          name,
          departmentId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Sub-department with this name already exists in this department"
      });
    }

    const subDepartment = await prisma.subDepartment.create({
      data: {
        name,
        departmentId
      },
      include: {
        department: true
      }
    });

    res.status(201).json({
      success: true,
      message: "Sub-department created successfully",
      data: subDepartment
    });

  } catch (error) {
    console.error("Create Sub-Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update sub-department
exports.updateSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId } = req.body;

    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id },
      include: {
        department: true
      }
    });

    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "Sub-department not found"
      });
    }

    // If department is being changed
    if (departmentId && departmentId !== subDepartment.departmentId) {
      const newDepartment = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      if (!newDepartment) {
        return res.status(404).json({
          success: false,
          message: "New department not found"
        });
      }

      // Check if name already exists in new department
      if (name) {
        const existing = await prisma.subDepartment.findUnique({
          where: {
            name_departmentId: {
              name,
              departmentId
            }
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Sub-department with this name already exists in the target department"
          });
        }
      }
    }

    // If only name is being changed
    if (name && name !== subDepartment.name) {
      const existing = await prisma.subDepartment.findUnique({
        where: {
          name_departmentId: {
            name,
            departmentId: departmentId || subDepartment.departmentId
          }
        }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Sub-department with this name already exists in this department"
        });
      }
    }

    const updatedSubDepartment = await prisma.subDepartment.update({
      where: { id },
      data: {
        name: name || subDepartment.name,
        departmentId: departmentId || subDepartment.departmentId
      },
      include: {
        department: true
      }
    });

    res.json({
      success: true,
      message: "Sub-department updated successfully",
      data: updatedSubDepartment
    });

  } catch (error) {
    console.error("Update Sub-Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Delete sub-department
exports.deleteSubDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id },
      include: {
        staff: true,
        designations: {
          include: {
            staff: true
          }
        }
      }
    });

    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "Sub-department not found"
      });
    }

    // Check if any staff in sub-department or its designations
    const hasStaff = subDepartment.staff.length > 0 || 
                     subDepartment.designations.some(d => d.staff.length > 0);

    if (hasStaff) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sub-department with assigned staff. Please reassign staff first."
      });
    }

    await prisma.subDepartment.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Sub-department deleted successfully"
    });

  } catch (error) {
    console.error("Delete Sub-Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ======================
// DESIGNATION CRUD
// ======================

// Get all designations
exports.getAllDesignations = async (req, res) => {
  try {
    const designations = await prisma.designation.findMany({
      include: {
        subDepartment: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    res.json({
      success: true,
      data: designations
    });

  } catch (error) {
    console.error("Get All Designations Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get designations by sub-department
exports.getDesignationsBySubDepartment = async (req, res) => {
  try {
    const { subDepartmentId } = req.params;

    const designations = await prisma.designation.findMany({
      where: { subDepartmentId },
      include: {
        subDepartment: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    res.json({
      success: true,
      data: designations
    });

  } catch (error) {
    console.error("Get Designations By Sub-Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Get single designation
exports.getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;

    const designation = await prisma.designation.findUnique({
      where: { id },
      include: {
        subDepartment: {
          include: {
            department: true
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found"
      });
    }

    res.json({
      success: true,
      data: designation
    });

  } catch (error) {
    console.error("Get Designation By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Create designation
exports.createDesignation = async (req, res) => {
  try {
    const { title, subDepartmentId } = req.body;

    if (!title || !subDepartmentId) {
      return res.status(400).json({
        success: false,
        message: "Title and subDepartmentId are required"
      });
    }

    // Check if sub-department exists
    const subDepartment = await prisma.subDepartment.findUnique({
      where: { id: subDepartmentId }
    });

    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "Sub-department not found"
      });
    }

    // Check if designation already exists in this sub-department
    const existing = await prisma.designation.findUnique({
      where: {
        title_subDepartmentId: {
          title,
          subDepartmentId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Designation with this title already exists in this sub-department"
      });
    }

    const designation = await prisma.designation.create({
      data: {
        title,
        subDepartmentId
      },
      include: {
        subDepartment: {
          include: {
            department: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: designation
    });

  } catch (error) {
    console.error("Create Designation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Update designation
exports.updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subDepartmentId } = req.body;

    const designation = await prisma.designation.findUnique({
      where: { id },
      include: {
        subDepartment: true
      }
    });

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found"
      });
    }

    // If sub-department is being changed
    if (subDepartmentId && subDepartmentId !== designation.subDepartmentId) {
      const newSubDepartment = await prisma.subDepartment.findUnique({
        where: { id: subDepartmentId }
      });
      if (!newSubDepartment) {
        return res.status(404).json({
          success: false,
          message: "New sub-department not found"
        });
      }

      // Check if title already exists in new sub-department
      if (title) {
        const existing = await prisma.designation.findUnique({
          where: {
            title_subDepartmentId: {
              title,
              subDepartmentId
            }
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Designation with this title already exists in the target sub-department"
          });
        }
      }
    }

    // If only title is being changed
    if (title && title !== designation.title) {
      const existing = await prisma.designation.findUnique({
        where: {
          title_subDepartmentId: {
            title,
            subDepartmentId: subDepartmentId || designation.subDepartmentId
          }
        }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Designation with this title already exists in this sub-department"
        });
      }
    }

    const updatedDesignation = await prisma.designation.update({
      where: { id },
      data: {
        title: title || designation.title,
        subDepartmentId: subDepartmentId || designation.subDepartmentId
      },
      include: {
        subDepartment: {
          include: {
            department: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Designation updated successfully",
      data: updatedDesignation
    });

  } catch (error) {
    console.error("Update Designation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Delete designation
exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    const designation = await prisma.designation.findUnique({
      where: { id },
      include: {
        staff: true
      }
    });

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: "Designation not found"
      });
    }

    if (designation.staff.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete designation with assigned staff. Please reassign staff first."
      });
    }

    await prisma.designation.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Designation deleted successfully"
    });

  } catch (error) {
    console.error("Delete Designation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ======================
// HIERARCHY DATA
// ======================

// Get complete hierarchy (departments -> sub-departments -> designations)
exports.getCompleteHierarchy = async (req, res) => {
  try {
    const hierarchy = await prisma.department.findMany({
      include: {
        subDepartments: {
          include: {
            designations: {
              orderBy: {
                title: 'asc'
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: hierarchy
    });

  } catch (error) {
    console.error("Get Complete Hierarchy Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};