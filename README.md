# Scalable Image Upload Server

##  Overview
This project is a scalable backend system for uploading images.  
It uses multiple backend servers behind an NGINX load balancer and stores images in AWS S3.

---

## ⚙️ Features
- Upload images (JPG/PNG only)
- File size limit: 2MB
- Unique file naming (UUID + timestamp)
- AWS S3 integration
- Multiple backend instances (scaling)
- NGINX load balancing (round-robin)
- CI pipeline using GitHub Actions
- No database (stateless architecture)

---

## 📡 API

### POST /upload

Upload an image using multipart/form-data

#### Request:
- Key: `image`
- Type: File

#### Response:
```json
{
  "url": "https://<bucket>.s3.amazonaws.com/<file>",
  "servedBy": "3001"
}
