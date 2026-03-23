/**
 * OpenAI vision + structured JSON for clothing metadata + optional rich garment profile.
 */

const OpenAI = require('openai');
const { TYPES, COLORS, SEASONS, STYLES } = require('../lib/metadataOptions');
const {
  CATEGORY,
  SUBTYPE,
  FORMALITY,
  SILHOUETTE,
  MATERIAL_VIBE,
  PATTERN,
  LAYER_ROLE,
  STATEMENT,
  COLOR_FAMILY,
  WARMTH,
  VERSATILITY,
  UNSPECIFIED,
} = require('../lib/garmentProfile');

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
      category: { type: 'string', enum: CATEGORY },
      subtype: { type: 'string', enum: SUBTYPE },
      formality: { type: 'string', enum: FORMALITY },
      silhouette: { type: 'string', enum: SILHOUETTE },
      materialVibe: { type: 'string', enum: MATERIAL_VIBE },
      patternOrTexture: { type: 'string', enum: PATTERN },
      layerRole: { type: 'string', enum: LAYER_ROLE },
      statementLevel: { type: 'string', enum: STATEMENT },
      colorFamily: { type: 'string', enum: COLOR_FAMILY },
      warmth: { type: 'string', enum: WARMTH },
      versatility: { type: 'string', enum: VERSATILITY },
    },
    required: [
      'type',
      'color',
      'season',
      'style',
      'confidence',
      'category',
      'subtype',
      'formality',
      'silhouette',
      'materialVibe',
      'patternOrTexture',
      'layerRole',
      'statementLevel',
      'colorFamily',
      'warmth',
      'versatility',
    ],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You classify ONE clothing item in a photo for a wardrobe / outfit app (structured JSON).

confidence:
- "high" ONLY if garment type and main color are clearly visible (single item, reasonably sharp).
- "low" if: blurry/dark photo, multiple competing items, face-only, not clothing, packaging, or you would be guessing.

When confidence is "low", still output valid enums for ALL fields. For core fields use placeholders: type "T-Shirt", color "Black", season "All Season", style "Casual". For rich fields use "${UNSPECIFIED}" only; the server discards low-confidence rows.

When confidence is "high":
- Distinguish: blazer vs denim jacket vs hoodie vs button-up vs tee; dress shoes vs sneakers vs boots; dress pants vs jeans vs joggers.
- subtype: pick the closest label (e.g. denim_jacket for blue jean jackets, blazer for tailored jackets that read as suiting).
- category: top | bottom | shoes | outerwear | mid_layer (blazers = mid_layer).
- layerRole: base for shirts/tees/hoodies/sweaters/dresses; mid for blazers; outer for coats/jackets worn as outer layer.
- formality: match visible construction (suiting/blazer/dress shoes → higher; jersey/tee/sneakers → lower).
- materialVibe / patternOrTexture / silhouette / warmth / versatility: best guess from the photo; use "${UNSPECIFIED}" if not visible.
- Never use lazy generic core combos (e.g. Shirt+Blue+All Season+Casual) unless the photo is clearly that.
- Footwear must be Shoes, Boots, Sneakers, or Sandals, never Shirt/T-Shirt for shoes.`;

/**
 * @returns {Promise<object>} full parsed fields including confidence
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
  const timeoutMs = Math.min(Math.max(Number(process.env.OPENAI_ANALYZE_TIMEOUT_MS) || 35000, 5000), 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.15,
        max_tokens: 520,
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
                text: 'Classify this garment. Return JSON matching the schema including confidence and rich fields.',
              },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
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
      category: parsed.category,
      subtype: parsed.subtype,
      formality: parsed.formality,
      silhouette: parsed.silhouette,
      materialVibe: parsed.materialVibe,
      patternOrTexture: parsed.patternOrTexture,
      layerRole: parsed.layerRole,
      statementLevel: parsed.statementLevel,
      colorFamily: parsed.colorFamily,
      warmth: parsed.warmth,
      versatility: parsed.versatility,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analyzeItemImageOpenAI, ITEM_SCHEMA };
