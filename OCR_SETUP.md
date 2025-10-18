# OCR Setup Guide

This app relies on Google's **Gemini API** to extract line items from receipt images. Configure a Gemini API key in Netlify and the client will automatically send uploads to the bundled Netlify function.

## Quick Start

1. **Create a Gemini API key**

   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Click "Create API Key" and copy the generated value

2. **Add the key to Netlify**

   - Netlify dashboard → **Site settings → Environment variables**
   - Add `VITE_GEMINI_API_KEY` with your key and redeploy

3. **All set**

   - The OCR flow now runs entirely on Gemini in production

## How It Works

- The React client uploads the selected image (base64 data URL) to `/.netlify/functions/scan-receipt`.
- The Netlify function calls `gemini-2.0-flash-exp` with a JSON-only prompt.
- Gemini responds with structured line items which flow back to the UI.

## Pricing

- **Free usage**: governed by Google Cloud $300 free-trial credits and service quotas (no fixed per-image always-free allowance)
- **Model**: `gemini-2.0-flash-exp`
- **Beyond credits**: input ≈ $0.0001935 per image, output ≈ $0.04 per image
- [Pricing details](https://cloud.google.com/vertex-ai/generative-ai/pricing)

## Testing Locally

1. Install Netlify CLI:

   ```bash
   npm install -g netlify-cli
   ```

2. Create `.env` in the project root:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_key_here
   ```

3. Run the local function + Vite dev server:

   ```bash
   netlify dev
   ```

4. Open `http://localhost:8888` and upload a sample receipt.

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Yes | Google Gemini API key for OCR |

*Store the key in Netlify, not `.env.local` or source control.*

## Troubleshooting

### "OCR failed. Ensure VITE_GEMINI_API_KEY is configured"

- Double-check the key is set in Netlify environment variables.
- Redeploy after adding or updating the key.
- Confirm the key has access to the Gemini API in Google Cloud.

### OCR returns empty items

- Retake the photo with better lighting and focus.
- Make sure item names and prices are readable.
- Verify the receipt uses Latin characters (model is prompted with `eng` context).

### Hitting rate limits

- Wait until the free quota resets (daily) or upgrade the Gemini plan.
- The client currently requires Gemini; OCR requests will fail once the quota is exhausted.

## Advanced: Custom OCR Endpoint

Set a custom endpoint if you want to proxy Gemini or run your own service:

```env
VITE_OCR_ENDPOINT=https://your-custom-ocr-endpoint.com/scan
```

Your endpoint should:

- Accept `POST` requests with `{ "image": "data:image/<type>;base64,..." }`
- Return `{ "items": [{ "name": "...", "qty": 1, "price": 9.99 }], "rawText": "...", "provider": "gemini" }`

## API Response Format

```json
{
  "items": [
    { "name": "Butter Chicken", "qty": 2, "price": 15.50 },
    { "name": "Naan Bread", "qty": 3, "price": 3.00 }
  ],
  "rawText": "Raw OCR text...",
  "provider": "gemini"
}
```

## Support

1. Review Netlify function logs under the **Functions** tab.
2. Inspect browser console output for client-side errors.
3. Confirm the Gemini key is active and copied exactly.
