# Scalable Image Upload Server

## Overview

This project is an Express backend for uploading JPG and PNG images. It stores uploaded images in AWS S3 when AWS credentials are configured, and it can run in a no-AWS mode for local testing and CI.

## Features

- Upload JPG and PNG images with `multipart/form-data`
- Enforce a 2 MB upload limit
- Generate unique object keys with `crypto.randomUUID()`
- Upload to AWS S3 when environment variables are present
- Return a deterministic no-AWS response for CI and local smoke tests
- Include automated tests with Node's built-in test runner
- Run CI with GitHub Actions

## Requirements

- Node.js 20 or newer
- npm
- AWS credentials and an S3 bucket for real S3 uploads

## Setup

Install dependencies:

```bash
npm ci
```

Create a `.env` file only when you want real S3 uploads:

```bash
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_REGION=your-region
S3_BUCKET=your-bucket-name
PORT=3001
```

The app still accepts uploads without these variables, but it returns a no-AWS response instead of uploading to S3. The same no-AWS response is used whenever `CI=true`, even if credentials are present.

## Run Locally

```bash
npm start
```

The server listens on `http://localhost:3001` by default.

Health check:

```bash
curl http://localhost:3001/
```

Upload an image:

```bash
curl -X POST http://localhost:3001/upload -F "image=@test.jpg"
```

## API

### `GET /`

Returns a plain-text health check:

```text
Server is running
```

### `GET /upload`

Returns a short message explaining that uploads must use `POST`.

### `POST /upload`

Uploads an image using `multipart/form-data`.

Request field:

```text
image
```

Successful S3 response:

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/file.jpg",
  "servedBy": "3001"
}
```

Successful no-AWS response:

```json
{
  "message": "Upload accepted; AWS S3 is not used in this environment",
  "fileName": "test.jpg",
  "size": 12345,
  "servedBy": "3001"
}
```

## Testing

Run the automated tests:

```bash
npm test
```

The test suite covers the health check, missing upload file handling, accepted JPG uploads without AWS configuration, and rejected non-image uploads.

## CI Pipeline

GitHub Actions runs on `push` and `pull_request`. The pipeline:

1. Checks out the repository
2. Sets up Node.js 20 with npm caching
3. Installs dependencies with `npm ci`
4. Runs `npm test`
5. Starts the server in CI mode
6. Runs health-check and upload smoke tests with `curl`

The CI workflow does not require AWS secrets.
