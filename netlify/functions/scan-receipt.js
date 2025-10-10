// Netlify function for OCR using Gemini API

function parseImagePayload(image) {
  if (!image) return null;

  if (typeof image === "object" && image !== null) {
    const maybeBase64 = image.base64 || image.data || image.image;
    if (typeof maybeBase64 === "string" && maybeBase64.trim()) {
      return {
        base64: maybeBase64.trim(),
        mimeType: image.mimeType || image.mime_type || "image/jpeg"
      };
    }
  }

  if (typeof image !== "string") return null;

  if (image.startsWith("data:")) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
      base64: match[2],
      mimeType: match[1] || "image/jpeg"
    };
  }

  return {
    base64: image,
    mimeType: "image/jpeg"
  };
}

async function scanWithGemini(imagePayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { base64, mimeType } = imagePayload || {};
  if (!base64) throw new Error("Missing base64 image data");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a receipt OCR assistant. Extract ALL purchased line items and key totals from this receipt image.
Output ONLY a JSON object with this exact shape (no prose, markdown, or code fences):
{
  "items": [
    {"name": "Chicken Burger", "qty": 1, "price": 42.50},
    {"name": "Iced Tea", "qty": 2, "price": 15.00}
  ],
  "summary": {
    "subtotal": 72.50,
    "serviceCharge": 7.25,
    "total": 79.75,
    "currency": "MVR"
  }
}

Rules:
- Items must exclude subtotals, totals, tax, service charges, and discounts.
- `qty` defaults to 1 when not shown on the receipt.
- `price` is the unit price (no currency symbols).
- `summary.subtotal`, `summary.serviceCharge`, and `summary.total` are monetary amounts (not percentages). Use null if a value is not visible.
- `summary.currency` should return the major currency code (e.g., "MVR", "USD") if visible, otherwise null.
- Return an empty array for items if nothing is detected, but keep the JSON object structure.
- Do NOT include any text outside of the JSON object.`
              },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Extract JSON from response (might have markdown code blocks)
  const trimmed = text.trim();
  let parsed;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const braceStart = trimmed.indexOf('{');
    const braceEnd = trimmed.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      try {
        parsed = JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
      } catch {
        const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const items = JSON.parse(arrayMatch[0]);
            return { items: Array.isArray(items) ? items : [], rawText: text, summary: {} };
          } catch {
            return { items: [], rawText: text, summary: {} };
          }
        }
        return { items: [], rawText: text, summary: {} };
      }
    } else {
      const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const items = JSON.parse(arrayMatch[0]);
          return { items: Array.isArray(items) ? items : [], rawText: text, summary: {} };
        } catch {
          return { items: [], rawText: text, summary: {} };
        }
      }
      return { items: [], rawText: text, summary: {} };
    }
  }

  if (Array.isArray(parsed)) {
    return { items: parsed, rawText: text, summary: {} };
  }

  if (parsed && typeof parsed === "object") {
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const summary = parsed.summary && typeof parsed.summary === "object" ? parsed.summary : {};
    return { items, summary, rawText: text };
  }

  return { items: [], rawText: text, summary: {} };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString()
      : event.body;
    const { image } = JSON.parse(body || "{}");
    const parsedImage = parseImagePayload(image);

    if (!parsedImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid image payload" })
      };
    }

    let result;

    result = await scanWithGemini(parsedImage);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: result.items,
        summary: result.summary || {},
        rawText: result.rawText,
        provider: "gemini"
      })
    };
  } catch (error) {
    console.error("Gemini OCR failed", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "OCR failed. Ensure GEMINI_API_KEY is configured in Netlify environment variables."
      })
    };
  }
};
