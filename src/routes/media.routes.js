const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const cloudinary = require("../config/cloudinary");

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto", // 🔥 auto detect image/video/audio
          folder: "contact"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file.buffer);
    });

    res.json({
      url: result.secure_url,
      type: result.resource_type
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;