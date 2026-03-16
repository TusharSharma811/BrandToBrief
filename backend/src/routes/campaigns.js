const { Router } = require("express");
const { CampaignRequestSchema } = require("../schemas");
const { CampaignGenerator, NotFoundError } = require("../services/campaignGenerator");
const { QuotaExceededError } = require("../services/geminiService");

const router = Router();

// Lazy singleton — created on first request (matches Python pattern)
let generator = null;

function getGenerator() {
  if (!generator) {
    generator = new CampaignGenerator();
  }
  return generator;
}

/**
 * POST /api/v1/campaigns/generate
 */
router.post("/generate", async (req, res) => {
  try {
    // Validate request body
    const parseResult = CampaignRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        detail: "Validation error",
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await getGenerator().generate(parseResult.data);
    return res.json(result);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return res.status(429).json({
        detail: err.message,
        retry_after_seconds: err.retryAfterSeconds,
      });
    }

    console.error("Campaign generation error:", err);
    return res.status(503).json({
      detail: `Campaign service unavailable: ${err.message}`,
    });
  }
});

/**
 * GET /api/v1/campaigns/:campaign_id
 */
router.get("/:campaign_id", async (req, res) => {
  try {
    const result = await getGenerator().getCampaign(req.params.campaign_id);
    return res.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ detail: err.message });
    }
    console.error("Campaign retrieval error:", err);
    return res.status(503).json({
      detail: `Campaign service unavailable: ${err.message}`,
    });
  }
});

module.exports = router;
