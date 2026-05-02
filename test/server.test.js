const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";
delete process.env.AWS_ACCESS_KEY;
delete process.env.AWS_SECRET_KEY;
delete process.env.AWS_REGION;
delete process.env.S3_BUCKET;

const app = require("../server");

function startTestServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });

    server.on("error", reject);
  });
}

test("GET / returns health check text", async () => {
  const server = await startTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/`);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "Server is running");
  } finally {
    await server.close();
  }
});

test("GET /app returns the upload frontend", async () => {
  const server = await startTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/app`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(body, /<h1>Image Upload<\/h1>/);
    assert.match(body, /id="uploadButton"/);
  } finally {
    await server.close();
  }
});

test("POST /upload rejects requests without a file", async () => {
  const server = await startTestServer();

  try {
    const response = await fetch(`${server.baseUrl}/upload`, {
      method: "POST",
      body: new FormData(),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "No file uploaded");
  } finally {
    await server.close();
  }
});

test("POST /upload accepts a JPG image when S3 is not configured", async () => {
  const server = await startTestServer();

  try {
    const form = new FormData();
    form.append(
      "image",
      new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])], {
        type: "image/jpeg",
      }),
      "test.jpg"
    );

    const response = await fetch(`${server.baseUrl}/upload`, {
      method: "POST",
      body: form,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.fileName, "test.jpg");
    assert.equal(body.size, 4);
    assert.match(body.message, /AWS S3 is not used/);
  } finally {
    await server.close();
  }
});

test("POST /upload rejects non-image files", async () => {
  const server = await startTestServer();

  try {
    const form = new FormData();
    form.append(
      "image",
      new Blob(["not an image"], { type: "text/plain" }),
      "test.txt"
    );

    const response = await fetch(`${server.baseUrl}/upload`, {
      method: "POST",
      body: form,
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Only JPG/PNG files allowed");
  } finally {
    await server.close();
  }
});
