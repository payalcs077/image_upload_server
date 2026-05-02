require("dotenv").config();

const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const app = express();

// -------------------- Multer Setup --------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG files allowed"), false);
    }
  },
});

// -------------------- AWS S3 Setup --------------------
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

// -------------------- Routes --------------------

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Upload API
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log(`Handled by port ${PORT}`);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // ✅ CI mode (NO AWS)
    if (!process.env.AWS_ACCESS_KEY) {
      return res.json({
        message: "CI test mode",
        servedBy: PORT
      });
    }

    const fileName = `${uuidv4()}-${Date.now()}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    console.log("Uploading:", params.Key);

    const data = await s3.upload(params).promise();

    // ✅ Proper response
    res.json({
      url: data.Location,
      servedBy: PORT
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);

    res.status(500).json({
      error: err.message || "Upload failed",
    });
  }
});
// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});