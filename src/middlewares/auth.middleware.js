// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                message: 'Access denied. No token provided.' 
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if we have userId or id in the token
        const userId = decoded.userId || decoded.id || decoded.sub;
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token: No user identifier found' 
            });
        }

        // Find user by ID
        const user = await prisma.staff.findUnique({
            where: { 
                id: userId 
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isSuperAdmin: true,
                departmentId: true,
                subDepartmentId: true,
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

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found or token expired' 
            });
        }

        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Authentication failed',
            error: error.message 
        });
    }
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({ 
            success: false,
            message: 'Access denied. Super admin privileges required' 
        });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: 'Authentication required' 
        });
    }
    
    // Allow both SUPERADMIN and ADMIN roles
    if (!req.user.isSuperAdmin && req.user.role !== 'ADMIN') {
        return res.status(403).json({ 
            success: false,
            message: 'Access denied. Admin privileges required' 
        });
    }
    next();
};

module.exports = { authenticate, requireSuperAdmin, requireAdmin };