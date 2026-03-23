/**
 * OpenAI stylist rerank: pick best candidate or reject all with guidance.
 */

const OpenAI = require('openai');
const { RUBRIC_SUMMARY } = require('../lib/styleRubric');

const RESPONSE_SCHEMA = {
  name: 'outfit_stylist_rerank',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      decision: { type: 'string', enum: ['pick', 'reject_all'] },
      chosen_index: { type: 'integer' },
      stylist_reason: { type: 'string' },
      missing_item_suggestion: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['decision', 'chosen_index', 'stylist_reason', 'missing_item_suggestion', 'confidence'],
    additionalProperties: false,
  },
};

function summarizeItem(it) {
  if (!it) return null;
  const p = it.profile || {};
  const parts = [`${it.type} (${it.color})`, it.style || ''];
  if (p.subtype) parts.push(`subtype:${p.subtype}`);
  if (p.formality) parts.push(`formality:${p.formality}`);
  if (p.versatility) parts.push(`versatility:${p.versatility}`);
  if (p.layerRole) parts.push(`layer:${p.layerRole}`);
  return parts.filter(Boolean).join(' · ');
}

/**
 * @returns {Promise<{
 *   rejectAll?: boolean,
 *   chosenIndex?: number,
 *   stylistReason?: string,
 *   missingItemSuggestion?: string,
 *   confidence?: string
 * } | null>}
 */
async function rerankOutfitCandidates(candidates, occasion, vibe, weather = '') {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (process.env.OPENAI_OUTFIT_RERANK === '0') return null;
  if (!candidates || candidates.length < 1) return null;

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const client = new OpenAI({ apiKey });

  const payload = {
    occasion: occasion || 'Casual',
    aesthetic: vibe || 'Casual',
    weather: weather && String(weather).trim() ? String(weather).trim() : undefined,
    rubric: RUBRIC_SUMMARY,
    candidates: candidates.map((c, i) => ({
      index: i,
      local_score_hint: c.localScore,
      pieces: ['top', 'mid', 'bottom', 'shoes', 'outerwear']
        .map((slot) => {
          const it = c.selected[slot];
          return it ? summarizeItem(it) : null;
        })
        .filter(Boolean),
    })),
  };

  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(Number(process.env.OPENAI_RERANK_TIMEOUT_MS) || 25000, 5000), 90000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.2,
        max_tokens: 450,
        response_format: {
          type: 'json_schema',
          json_schema: RESPONSE_SCHEMA,
        },
        messages: [
          {
            role: 'system',
            content:
              'You are a practical, tasteful stylist (not avant-garde). Candidates are fixed wardrobe pieces: do not invent items. Prefer simple, clean, wearable outfits; avoid forced layering or clowny mixes. For Work/Formal/Date Night/Classy/Minimalist, blazers belong over a base layer (shirt/tee/knit), not as the only top. For Weekend/Casual/Outdoor or Streetwear/Sporty vibes, a clean 3-piece without a blazer is often best: do not reject every option just because a formal blazer appears in some rows; pick the most cohesive street-appropriate set if one exists. Use decision "reject_all" only if every candidate is genuinely weak or incoherent; then give a short missing_item_suggestion (1-2 item types). Use "pick" with chosen_index 0-based when one candidate is clearly best. stylist_reason: max ~70 words, specific (silhouette, formality, color), not hype. Occasion = where they are going; aesthetic = how they want to look.',
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
    const decision = parsed.decision === 'reject_all' ? 'reject_all' : 'pick';
    const idx = Number(parsed.chosen_index);
    const reason = String(parsed.stylist_reason || '').trim();
    const missing = String(parsed.missing_item_suggestion || '').trim();
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium';

    if (!reason) return null;

    if (decision === 'reject_all') {
      return {
        rejectAll: true,
        stylistReason: reason,
        missingItemSuggestion: missing || 'Add pieces that better match the occasion and aesthetic.',
        confidence,
      };
    }

    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) return null;

    return {
      rejectAll: false,
      chosenIndex: idx,
      stylistReason: reason,
      missingItemSuggestion: missing,
      confidence,
    };
  } catch (err) {
    console.warn('[openaiOutfitRerank]', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { rerankOutfitCandidates };
