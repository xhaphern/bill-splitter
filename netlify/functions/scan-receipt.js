// Netlify function for OCR using Gemini API

function parseImagePayload(image) {
  if (!image) return null;

  if (typeof image === "object" && image !== null) {
    const maybeBase64 = image.base64 || image.data || image.image;
    if (typeof maybeBase64 === "string") {
      const trimmed = maybeBase64.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("data:")) {
        const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return null;
        return {
          base64: match[2],
          mimeType: image.mimeType || image.mime_type || match[1] || "image/jpeg",
        };
      }
      return {
        base64: trimmed,
        mimeType: image.mimeType || image.mime_type || "image/jpeg",
      };
    }
  }

  if (typeof image !== "string") return null;

  const trimmed = image.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
      base64: match[2],
      mimeType: match[1] || "image/jpeg",
    };
  }

  return {
    base64: trimmed,
    mimeType: "image/jpeg",
  };
}

// Helper function to calculate subtotal from items
function calculateSubtotal(items) {
  return items.reduce((sum, item) => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    return sum + (qty * price);
  }, 0);
}

function validateAndFixItems(items, subtotal) {
  if (!Array.isArray(items) || items.length === 0) return items;
  if (!subtotal || subtotal <= 0) return items;

  // Calculate sum using current prices
  const calculatedSubtotal = calculateSubtotal(items);

  const difference = Math.abs(calculatedSubtotal - subtotal);
  const tolerance = subtotal * 0.02; // 2% tolerance for rounding

  // If calculated subtotal matches receipt subtotal, we're good
  if (difference <= tolerance) {
    return items;
  }

  // Try interpreting prices as line totals instead
  const fixedItems = items.map(item => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = Number(item.lineTotal) || (qty * price);

    // If lineTotal exists and differs from qty*price, use lineTotal as source of truth
    if (lineTotal > 0 && Math.abs(lineTotal - (qty * price)) > 0.01) {
      return {
        ...item,
        price: qty > 0 ? lineTotal / qty : price,
        qty: qty
      };
    }

    return item;
  });

  // Check if this fixes the subtotal
  const newCalculatedSubtotal = calculateSubtotal(fixedItems);

  const newDifference = Math.abs(newCalculatedSubtotal - subtotal);

  // If the fix improved the match, use fixed items
  if (newDifference < difference) {
    return fixedItems;
  }

  // Otherwise return original items
  return items;
}

async function scanWithGemini(imagePayload) {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not configured");

  const { base64, mimeType } = imagePayload || {};
  if (!base64) throw new Error("Missing base64 image data");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
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
                  text: `You are a receipt OCR assistant. Extract ALL purchased line items and key totals from this receipt image.\nOutput ONLY a JSON object with this exact shape (no prose, markdown, or code fences):\n{\n  "items": [\n    {"name": "Chicken Burger", "qty": 1, "price": 42.50, "lineTotal": 42.50},\n    {"name": "Iced Tea", "qty": 2, "price": 7.50, "lineTotal": 15.00}\n  ],\n  "summary": {\n    "subtotal": 57.50,\n    "discount1Percent": 5,\n    "serviceChargeAmount": 5.75,\n    "serviceChargePercent": 10,\n    "discount2Percent": 10,\n    "gstPercent": 8,\n    "total": 63.25,\n    "currency": "MVR"\n  }\n}\n\nRules:\n- Items must exclude subtotals, totals, tax, service charges, and discounts.\n- "qty" is the quantity shown on the receipt (defaults to 1 if not shown).\n- "price" is the unit price per single item (no currency symbols).\n- "lineTotal" is the total amount shown on that line of the receipt for all quantities combined.\n- IMPORTANT: Some receipts show "lineTotal" (e.g., "Espresso x2 = 50.00" means lineTotal is 50.00, price is 25.00). Other receipts show unit price (e.g., "Espresso 25.00 Qty: 2" means price is 25.00, lineTotal is 50.00). Extract both values accurately. If only one value is visible, calculate the other: price = lineTotal / qty, or lineTotal = price × qty.\n- The sum of all lineTotal values should equal summary.subtotal. Use this to verify your extraction.\n- "summary.subtotal", "summary.serviceChargeAmount", and "summary.total" are monetary amounts (not percentages). Use null if a value is not visible.\n- "summary.discount1Percent" is the first discount percentage if any (e.g., 5 for "5% discount", 10 for "10% off"). Use null if not visible.\n- "summary.serviceChargePercent" is the service charge percentage (e.g., 10 for 10%, 15 for 15%). Extract this from the receipt if visible (often shown as "Service Charge 10%" or "SC 10%"). Use null if not visible.\n- "summary.discount2Percent" is the second discount percentage if any (some receipts have multiple discounts). Use null if not visible.\n- "summary.gstPercent" is the GST/tax percentage (e.g., 8 for "GST 8%", 5 for "Tax 5%"). Use null if not visible.\n- "summary.currency" should return the major currency code (e.g., "MVR", "USD") if visible, otherwise null.\n- Return an empty array for items if nothing is detected, but keep the JSON object structure.\n- Do NOT include any text outside of the JSON object.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const trimmed = text.trim();
    let parsed = null;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const braceStart = trimmed.indexOf("{");
      const braceEnd = trimmed.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
        try {
          parsed = JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
        } catch {
          // fall through
        }
      }

      if (!parsed) {
        const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const items = JSON.parse(arrayMatch[0]);
            return { items: Array.isArray(items) ? items : [], rawText: text, summary: {} };
          } catch {
            // ignore and fall through
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

      // Validate and fix items using subtotal
      const subtotal = Number(summary.subtotal);
      const validatedItems = validateAndFixItems(items, subtotal);

      return { items: validatedItems, summary, rawText: text };
    }

    return { items: [], rawText: text, summary: {} };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Gemini API request timed out");
    }
    throw error;
  }
}

export const handler = async (event) => {
  const origin = event.headers?.origin;
  const allowOrigin = origin || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": event.headers?.["access-control-request-headers"] || "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin) {
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders,
        "Content-Length": "0",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Method not allowed" }),
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ error: "Invalid image payload" }),
      };
    }

    const result = await scanWithGemini(parsedImage);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({
        items: result.items,
        summary: result.summary || {},
        rawText: result.rawText,
        provider: "vision",
      }),
    };
  } catch (error) {
    console.error("OCR service failed", error);

    // Provide more specific error messages
    let errorMessage = "OCR failed. ";
    if (!process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      errorMessage += "VITE_GEMINI_API_KEY is not configured in Netlify environment variables.";
    } else {
      errorMessage += error.message || "Unknown error occurred.";
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};
