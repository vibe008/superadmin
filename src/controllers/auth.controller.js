const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password, role, departmentId, subDepartmentId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 🔹 Get staff with permissions
    const staff = await prisma.staff.findUnique({
      where: { email },
      include: {
        department: true,
        subDepartment: true,
        staffPermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!staff) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔹 Password check
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 🔹 Role Validation
    if (role === "SUPERADMIN") {
      if (!staff.isSuperAdmin) {
        return res.status(403).json({
          message: "Not authorized as SuperAdmin"
        });
      }
    } else {
      if (!departmentId || !subDepartmentId) {
        return res.status(400).json({
          message: "Department and SubDepartment required"
        });
      }

      if (
        staff.departmentId !== departmentId ||
        staff.subDepartmentId !== subDepartmentId
      ) {
        return res.status(403).json({
          message: "You are not allowed to access this department"
        });
      }
    }

    // 🔹 Extract permissions
    const permissions = staff.staffPermissions.map(
      sp => sp.permission.name
    );

    // 🔹 Generate Main Token
    const token = jwt.sign(
      {
        userId: staff.id,
        role: staff.role,
        isSuperAdmin: staff.isSuperAdmin,
        departmentId: role === "SUPERADMIN" ? null : staff.departmentId,
        subDepartmentId: role === "SUPERADMIN" ? null : staff.subDepartmentId,
        permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔹 Generate Chat Token
    const chatToken = jwt.sign(
      {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isSuperAdmin: staff.isSuperAdmin,
        departmentId: staff.departmentId,
        subDepartmentId: staff.subDepartmentId,
        permissions
      },
      process.env.CHAT_SECRET,
      { expiresIn: "24h" }
    );

    // 🔹 Create session
    await prisma.staffSession.create({
      data: {
        staffId: staff.id,
        loginTime: new Date(),
        status: "ACTIVE"
      }
    });

    // 🔹 Sync with Chat Backend
    try {
      await fetch(`${process.env.CHAT_BACKEND_URL}/api/staff/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`
        },
        body: JSON.stringify({
          staffId: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isSuperAdmin: staff.isSuperAdmin,
          permissions,
          departmentId: staff.departmentId,
          subDepartmentId: staff.subDepartmentId,
          status: "ONLINE"
        })
      });
    } catch (error) {
      console.error("Chat sync failed:", error.message);
    }

    // 🔹 Final Response
    res.json({
      success: true,
      message: "Login successful",
      token,
      chatToken,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isSuperAdmin: staff.isSuperAdmin,
        departmentId: staff.departmentId,
        subDepartmentId: staff.subDepartmentId,
        permissions
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const staffId = req.user.id; 

    const activeSession = await prisma.staffSession.findFirst({
      where: {
        staffId,
        status: "ACTIVE"
      }
    });

    if (activeSession) {
      const duration = Math.floor(
        (Date.now() - new Date(activeSession.loginTime)) / 1000
      );

      await prisma.staffSession.update({
        where: { id: activeSession.id },
        data: {
          status: "COMPLETED",
          logoutTime: new Date(),
          duration
        }
      });
    }

    // Notify chat backend - FIXED: Include API key in Authorization header
    let chatResponse = null;
    try {
      chatResponse = await fetch(`${process.env.CHAT_BACKEND_URL}/api/staff/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`  // Added this!
        },
        body: JSON.stringify({ staffId })
      });

      console.log('Chat backend response status:', chatResponse.status);

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        console.error('Chat backend error:', errorText);
      } else {
        const responseData = await chatResponse.json();
      }
    } catch (error) {
      console.error('Failed to notify chat backend:', error.message);
    }

    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get staff status with active hours
exports.getStaffStatus = async (req, res) => {

  try {
    const { staffId } = req.params;
    const { period = 'today' } = req.query;
    // Get current status from chat backend
    let chatStatus = null;
    try {
      const response = await fetch(
        `${process.env.CHAT_BACKEND_URL}/api/staff/${staffId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
          }
        }
      );
      const data = await response.json();   

      if (response.ok) {
        chatStatus = data;
      }
    } catch (error) {
      console.error('Error fetching staff status from chat:', error.message);
    }

    // Calculate active hours
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const sessions = await prisma.staffSession.findMany({
      where: {
        staffId,
        loginTime: { gte: startDate }
      },
      orderBy: { loginTime: 'desc' }
    });

    // Calculate total active seconds
    let totalSeconds = 0;
    sessions.forEach(session => {
      if (session.status === 'COMPLETED' && session.duration) {
        totalSeconds += session.duration;
      } else if (session.status === 'ACTIVE') {
        totalSeconds += Math.floor((Date.now() - session.loginTime) / 1000);
      }
    });

    // Format as hours:minutes
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedHours = `${hours}h ${minutes}m`;

    res.json({
      staffId,
      currentStatus: chatStatus?.status || 'OFFLINE',
      lastSeen: chatStatus?.lastSeen || null,
      activeHours: formattedHours,
      activeSeconds: totalSeconds,
      sessions: sessions.map(s => ({
        id: s.id,
        loginTime: s.loginTime,
        logoutTime: s.logoutTime,
        duration: s.duration ? `${Math.floor(s.duration / 3600)}h ${Math.floor((s.duration % 3600) / 60)}m` : null,
        status: s.status
      })),
      period
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};