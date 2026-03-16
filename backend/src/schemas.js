const { z } = require("zod");

const CampaignRequestSchema = z.object({
  product_name: z.string().min(2, "product_name must be at least 2 characters"),
  product_description: z.string().min(10, "product_description must be at least 10 characters"),
  target_audience: z.string().min(3, "target_audience must be at least 3 characters"),
  platforms: z.array(z.string()).min(1, "At least one platform is required"),
  campaign_goal: z.string().min(3, "campaign_goal must be at least 3 characters"),
  brand_style: z.string().optional().nullable(),
});

module.exports = { CampaignRequestSchema };
