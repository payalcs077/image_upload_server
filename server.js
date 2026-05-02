if (process.env.NODE_ENV !== "test") {
  require("dotenv").config();
}

const { randomUUID } = require("crypto");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();

// -------------------- Middleware --------------------
app.use(cors());

// -------------------- Multer Setup --------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG files allowed"), false);
    }
  },
});

// -------------------- AWS S3 Setup --------------------
function hasAwsConfig() {
  return Boolean(
    process.env.AWS_ACCESS_KEY &&
      process.env.AWS_SECRET_KEY &&
      process.env.AWS_REGION &&
      process.env.S3_BUCKET
  );
}

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });
}

function shouldUseMockUpload() {
  return (
    process.env.CI === "true" ||
    process.env.NODE_ENV === "test" ||
    !hasAwsConfig()
  );
}

function getFileExtension(mimetype) {
  return mimetype === "image/png" ? ".png" : ".jpg";
}

// -------------------- Routes --------------------

// Health check
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Optional GET /upload (for browser)
app.get("/upload", (req, res) => {
  res.send("Use POST method to upload image");
});

// Upload API
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const PORT = process.env.PORT || 3001;
    console.log(`Handled by port ${PORT}`);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (shouldUseMockUpload()) {
      return res.json({
        message: "Upload accepted; AWS S3 is not used in this environment",
        fileName: req.file.originalname,
        size: req.file.size,
        servedBy: PORT,
      });
    }

    const fileName = `${randomUUID()}-${Date.now()}${getFileExtension(
      req.file.mimetype
    )}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    console.log("Uploading:", params.Key);

    await createS3Client().send(new PutObjectCommand(params));

    res.json({
      url: `https://${params.Bucket}.s3.${
        process.env.AWS_REGION
      }.amazonaws.com/${encodeURIComponent(params.Key)}`,
      servedBy: PORT,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);

    res.status(500).json({
      error: err.message || "Upload failed",
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  return next();
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
