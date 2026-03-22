/**
 * OpenAI vision + structured JSON for clothing metadata.
 * Model must report confidence; only "high" is used by the app (low → discarded).
 */

const OpenAI = require('openai');
const { TYPES, COLORS, SEASONS, STYLES } = require('../lib/metadataOptions');

const ITEM_SCHEMA = {
  name: 'clothing_item_metadata',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TYPES },
      color: { type: 'string', enum: COLORS },
      season: { type: 'string', enum: SEASONS },
      style: { type: 'string', enum: STYLES },
      confidence: { type: 'string', enum: ['high', 'low'] },
    },
    required: ['type', 'color', 'season', 'style', 'confidence'],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You classify ONE clothing item in a photo for a wardrobe app (structured JSON).

confidence:
- "high" ONLY if garment type and main color are clearly visible (single item, reasonably sharp).
- "low" if: blurry/dark photo, multiple competing items, face-only, not clothing, packaging, or you would be guessing.

When confidence is "low", still output valid enum fields using placeholders: type "T-Shirt", color "Black", season "All Season", style "Casual" — the server discards them when confidence is not high.

When confidence is "high", pick the most specific accurate type (e.g. Sneakers vs Shoes for clear athletic shoes; Hoodie vs Sweater when clearly a hooded sweatshirt).`;

/**
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType]
 * @returns {Promise<{ type: string, color: string, season: string, style: string, confidence: 'high'|'low' }>}
 */
async function analyzeItemImageOpenAI(imageBuffer, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const mime = mimeType && /^image\/[a-z0-9.+-]+$/i.test(mimeType) ? mimeType : 'image/jpeg';
  const b64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mime};base64,${b64}`;

  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(Number(process.env.OPENAI_ANALYZE_TIMEOUT_MS) || 25000, 5000), 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.1,
        max_tokens: 220,
        response_format: {
          type: 'json_schema',
          json_schema: ITEM_SCHEMA,
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Classify this garment. Return JSON matching the schema including confidence.',
              },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
            ],
          },
        ],
      },
      { signal: controller.signal }
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('Empty OpenAI response');
    const parsed = JSON.parse(text);
    if (!parsed.type || !parsed.color || !parsed.season || !parsed.style) {
      throw new Error('Incomplete structured fields');
    }
    const confidence = parsed.confidence === 'high' ? 'high' : 'low';
    return {
      type: parsed.type,
      color: parsed.color,
      season: parsed.season,
      style: parsed.style,
      confidence,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analyzeItemImageOpenAI, ITEM_SCHEMA };
