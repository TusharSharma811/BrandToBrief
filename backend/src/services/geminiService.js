const { GoogleGenAI } = require("@google/genai");
const config = require("../config");

class GeminiService {
  constructor() {
    const opts = {};
    if (config.geminiUseVertex) {
      opts.vertexai = true;
      opts.project = config.googleCloudProject;
      opts.location = config.googleCloudRegion;
    } else if (config.geminiApiKey) {
      opts.apiKey = config.geminiApiKey;
    }
    this.client = new GoogleGenAI(opts);
  }

  /**
   * Generate structured campaign JSON from a prompt.
   * @param {string} prompt
   * @returns {Promise<Object>}
   */
  async generateCampaignJson(prompt) {
    const response = await this.client.models.generateContent({
      model: config.geminiTextModel,
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini did not return text for campaign JSON.");
    }
    return JSON.parse(text);
  }

  /**
   * Generate image bytes from a prompt.
   * @param {string} prompt
   * @returns {Promise<Buffer>}
   */
  async generateImageBytes(prompt) {
    const response = await this.client.models.generateContent({
      model: config.geminiImageModel,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image candidates returned.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        // Data may already be a Buffer or a base64 string
        if (Buffer.isBuffer(part.inlineData.data)) {
          return part.inlineData.data;
        }
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    throw new Error("Image bytes were not found in Gemini response.");
  }

  /**
   * Build the campaign prompt string from user input.
   * @param {Object} userInput
   * @returns {string}
   */
  static buildCampaignPrompt(userInput) {
    return `You are an elite AI Creative Director building a launch-ready multi-platform marketing campaign.
Return ONLY valid JSON matching the exact schema below.

INPUT
- product_name: ${userInput.product_name}
- product_description: ${userInput.product_description}
- target_audience: ${userInput.target_audience}
- platforms: ${userInput.platforms.join(", ")}
- campaign_goal: ${userInput.campaign_goal}
- brand_style: ${userInput.brand_style || "not specified"}

RULES
1) Keep language concrete, modern, and platform-native.
2) Ensure every platform gets tailored copy.
3) Produce emotional + functional messaging.
4) Video storyboard should be 5 concise scenes.
5) Add realistic performance_prediction in 3-4 lines.
6) Do NOT wrap JSON in markdown.

SCHEMA
{
  "concept": "string",
  "brand_tone": "string",
  "slogan": "string",
  "messaging_pillars": ["string", "string", "string", "string"],
  "landing_page_headline": "string",
  "product_description": "string",
  "email_copy": "string",
  "ad_headlines": ["string", "string", "string", "string", "string"],
  "video_storyboard": [
    {"title": "Scene 1", "body": "string"},
    {"title": "Scene 2", "body": "string"},
    {"title": "Scene 3", "body": "string"},
    {"title": "Scene 4", "body": "string"},
    {"title": "Scene 5", "body": "string"}
  ],
  "narration_script": "string",
  "social_captions": {
    "Instagram": "string",
    "TikTok": "string",
    "LinkedIn": "string"
  },
  "hashtags": ["string", "string", "string", "string", "string", "string", "string"],
  "content_calendar_ideas": ["string", "string", "string", "string", "string", "string", "string"],
  "performance_prediction": "string"
}`;
  }

  /**
   * Build image generation prompts from campaign JSON.
   * @param {Object} campaignJson
   * @param {string} productName
   * @returns {Array<{type: string, prompt: string}>}
   */
  static buildImagePrompts(campaignJson, productName) {
    const slogan = campaignJson.slogan || "";
    const tone = campaignJson.brand_tone || "";
    return [
      {
        type: "hero_image",
        prompt: `Ultra-realistic product hero shot for ${productName}. Campaign slogan: ${slogan}. Tone: ${tone}. Studio lighting, high contrast, premium ad style, 4k.`,
      },
      {
        type: "instagram_creative",
        prompt: `Instagram square ad creative for ${productName}, energetic composition, brand tone ${tone}, bold typography area for text overlay, modern lifestyle scene.`,
      },
      {
        type: "poster",
        prompt: `Vertical product launch poster for ${productName}, cinematic lighting, slogan '${slogan}', minimal but striking layout, print-ready composition.`,
      },
      {
        type: "storyboard_keyframe",
        prompt: `Single cinematic keyframe from a social ad for ${productName}, show transformation moment with emotional storytelling and dynamic motion cues.`,
      },
    ];
  }
}

module.exports = GeminiService;
