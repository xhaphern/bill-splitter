import { createWorker } from "@tesseract.js/node";

const workerPromise = (async () => {
  const worker = await createWorker();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");
  return worker;
})();

function parseImagePayload(image) {
  if (!image) return null;
  if (image.startsWith("data:")) {
    const base64 = image.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  try {
    return Buffer.from(image, "base64");
  } catch (_) {
    return null;
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString()
      : event.body;
    const { image } = JSON.parse(body || "{}");
    const buffer = parseImagePayload(image);

    if (!buffer) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid image payload" }) };
    }

    const worker = await workerPromise;
    const { data } = await worker.recognize(buffer);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.text || "" })
    };
  } catch (error) {
    console.error("OCR failed", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process image" })
    };
  }
};
