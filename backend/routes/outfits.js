const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { generateOutfit } = require('../services/outfitGenerator');

const router = express.Router();
router.use(requireAuth);

router.post('/generate', express.json(), (req, res) => {
  const occasion = (req.body.occasion && String(req.body.occasion).trim()) || '';
  const vibe = (req.body.vibe && String(req.body.vibe).trim()) || '';

  if (!occasion || !vibe) {
    return res.status(400).json({ error: 'Occasion and vibe are required.' });
  }

  try {
    const result = generateOutfit(req.session.userId, occasion, vibe);
    if (result.error) {
      return res.status(422).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Outfit generation failed. Please try again.' });
  }
});

module.exports = router;
