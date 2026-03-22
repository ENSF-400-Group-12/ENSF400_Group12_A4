/**
 * Optional OpenAI rerank over local outfit candidates (structured JSON).
 * Disabled when OPENAI_OUTFIT_RERANK=0 or no API key.
 */

const OpenAI = require('openai');
const { RUBRIC_SUMMARY } = require('../lib/styleRubric');

const RESPONSE_SCHEMA = {
  name: 'outfit_rerank',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      chosen_index: { type: 'integer' },
      explanation: { type: 'string' },
    },
    required: ['chosen_index', 'explanation'],
    additionalProperties: false,
  },
};

/**
 * @param {Array<{ selected: object, localScore: number }>} candidates
 * @param {string} occasion
 * @param {string} vibe
 * @returns {Promise<{ chosenIndex: number, explanation: string } | null>}
 */
async function rerankOutfitCandidates(candidates, occasion, vibe) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (process.env.OPENAI_OUTFIT_RERANK === '0') return null;
  if (!candidates || candidates.length < 2) return null;

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const client = new OpenAI({ apiKey });

  const payload = {
    occasion: occasion || 'Casual',
    vibe: vibe || 'Casual',
    rubric: RUBRIC_SUMMARY,
    candidates: candidates.map((c, i) => ({
      index: i,
      pieces: ['top', 'bottom', 'shoes', 'outerwear']
        .map((slot) => {
          const it = c.selected[slot];
          return it ? `${it.type} (${it.color}); ${it.style}` : null;
        })
        .filter(Boolean),
    })),
  };

  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(Number(process.env.OPENAI_RERANK_TIMEOUT_MS) || 20000, 5000), 90000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.25,
        max_tokens: 350,
        response_format: {
          type: 'json_schema',
          json_schema: RESPONSE_SCHEMA,
        },
        messages: [
          {
            role: 'system',
            content:
              'You choose exactly one outfit candidate by index. Judge color harmony, occasion appropriateness, and vibe. Use only listed pieces; do not invent items or mention weather. Do not prefer looks that lean on a casual or denim-type jacket for formal, work, date night, or minimalist aesthetics unless that candidate is clearly strongest. Occasion and vibe are already in the JSON — in "explanation" do not repeat those labels or say "this occasion"; write one short paragraph (max 90 words) on how the pieces work together.',
          },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
      },
      { signal: controller.signal }
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text);
    const idx = Number(parsed.chosen_index);
    const expl = String(parsed.explanation || '').trim();
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length || !expl) return null;
    return { chosenIndex: idx, explanation: expl };
  } catch (err) {
    console.warn('[openaiOutfitRerank]', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { rerankOutfitCandidates };
