const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.initChat = async (req, res) => {
  try {
    const { name, email, code, type } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name required" });
    }

    // Email is now required for both registered and guest users
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    let user;

    // Try to find existing user with this email and code
    user = await prisma.chatUser.findUnique({
      where: {
        email_code: { email, code: code || "guest" }
      }
    });

    if (!user) {
      // Check if this is a guest (no existing user in your system)
      // You can determine this by checking if the email exists in your main user table
      // For now, let's assume any new user with type 'smart' or 'xtrax' could be a guest
      // We'll set isGuest based on whether this email exists in your main users table
      
      // This is where you'd check if the email exists in your main users table
      // For example: const existingUser = await prisma.user.findUnique({ where: { email } });
      // For now, we'll assume if no existing chat user, it's a guest
      
      const isGuest = true; // Since we're creating a new user, it's likely a guest
      
      user = await prisma.chatUser.create({
        data: { 
          name, 
          email, 
          code: code || "guest", 
          type: type || "smart", // Keep the original type (smart or xtrax)
          isGuest // Set isGuest to true for guests
        }
      });
    } else {
      // Update existing user info if needed
      if (user.name !== name || user.type !== type) {
        user = await prisma.chatUser.update({
          where: { id: user.id },
          data: { 
            name,
            type: type || user.type
            // Don't change isGuest for existing users
          }
        });
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        type: user.type,
        name: user.name,
        email: user.email,
        code: user.code,
        isGuest: user.isGuest // This will be true for guests
      },
      process.env.CHAT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.error(error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: "User with this email and code already exists.",
        error: "DUPLICATE_ENTRY"
      });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};