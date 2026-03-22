/**
 * OpenAI vision + structured JSON for clothing metadata.
 * Requires OPENAI_API_KEY; model from OPENAI_MODEL (default gpt-4o-mini).
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
    },
    required: ['type', 'color', 'season', 'style'],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You are a clothing catalog assistant. Look at the garment photo and classify it for a wardrobe app.
Pick exactly one value per field from the allowed enums only. Use "All Season" when unclear for season.
Prefer the most specific garment type (e.g. Sneakers vs Shoes when clearly athletic footwear).
Be conservative: if the image is not clothing, choose the closest reasonable category or Accessories.`;

/**
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType]
 * @returns {Promise<{ type: string, color: string, season: string, style: string }>}
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
        temperature: 0.2,
        max_tokens: 200,
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
                text: 'Return JSON only matching the schema: type, color, season, style for this garment.',
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
    return {
      type: parsed.type,
      color: parsed.color,
      season: parsed.season,
      style: parsed.style,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analyzeItemImageOpenAI, ITEM_SCHEMA };
