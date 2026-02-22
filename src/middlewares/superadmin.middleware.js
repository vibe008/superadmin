module.exports = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({
      message: "Only SuperAdmin allowed"
    });
  }
  next();
};