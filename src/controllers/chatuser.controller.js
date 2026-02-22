const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.initChat = async (req, res) => {
  try {
    const { name, email, code, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({ message: "Email and type required" });
    }
    let user = await prisma.chatUser.findUnique({
      where: {
        email_code: { email, code }
      }
    });

    if (!user) {
      user = await prisma.chatUser.create({
        data: { name, email, code, type }
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        code: user.code,
        type: user.type,
        name: user.name,
        email: user.email
      },
      process.env.CHAT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};