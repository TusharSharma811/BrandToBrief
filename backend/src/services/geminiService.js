const { GoogleGenAI } = require("@google/genai");
const config = require("../config");

class QuotaExceededError extends Error {
  constructor(message, retryAfterSeconds = null) {
    super(message);
    this.name = "QuotaExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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
    try {
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
    } catch (err) {
      if (GeminiService.isQuotaExceededError(err)) {
        const retryAfterSeconds = GeminiService.getRetryAfterSeconds(err);
        throw new QuotaExceededError(
          "Gemini quota exceeded. Enable billing or retry later.",
          retryAfterSeconds
        );
      }
      throw err;
    }
  }

  /**
   * Generate image bytes from the configured image provider.
   * @param {string} prompt
   * @returns {Promise<Buffer>}
   */
  async generateImageBytes(prompt) {
    if (config.imageProvider === "huggingface") {
      return this.generateImageBytesWithHuggingFace(prompt);
    }

    return this.generateImageBytesWithGemini(prompt);
  }

  async generateImageBytesWithGemini(prompt) {
    try {
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
    } catch (err) {
      if (GeminiService.isQuotaExceededError(err)) {
        const retryAfterSeconds = GeminiService.getRetryAfterSeconds(err);
        throw new QuotaExceededError(
          "Gemini image quota exceeded. Enable billing or retry later.",
          retryAfterSeconds
        );
      }
      throw err;
    }
  }

  async generateImageBytesWithHuggingFace(prompt) {
    if (!config.huggingFaceApiKey) {
      throw new Error("HUGGING_FACE_API_KEY is required when IMAGE_PROVIDER=huggingface.");
    }

    if (typeof fetch !== "function") {
      throw new Error("Global fetch is not available in this Node runtime.");
    }

    const endpoint = `https://router.huggingface.co/hf-inference/models/${config.huggingFaceImageModel}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingFaceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await GeminiService.readErrorResponse(response);
      if (GeminiService.isQuotaExceededError({ status: response.status, message: errorText })) {
        throw new QuotaExceededError(
          "Hugging Face image quota exceeded. Retry later or use another token.",
          GeminiService.getRetryAfterSeconds({ message: errorText })
        );
      }
      throw new Error(
        `Hugging Face image generation failed (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  }

  static async readErrorResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        const payload = await response.json();
        if (typeof payload?.error === "string") {
          return payload.error;
        }
        return JSON.stringify(payload);
      }

      return await response.text();
    } catch (_err) {
      return response.statusText || "Unknown error";
    }
  }

  static isQuotaExceededError(err) {
    const message = String(err?.message || "");
    return err?.status === 429 || message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
  }

  static getRetryAfterSeconds(err) {
    const message = String(err?.message || "");
    const match = message.match(/retry in\s+([\d.]+)s/i);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.ceil(parsed) : null;
  }

  static buildMockCampaignJson(userInput) {
    const name = userInput.product_name;
    const audience = userInput.target_audience;
    const style = userInput.brand_style || "confident and modern";
    const platforms = userInput.platforms || [];

    return {
      concept: `From brief to buzz for ${name}`,
      brand_tone: style,
      slogan: `${name}: Built for ${audience}`,
      messaging_pillars: [
        "Clear customer problem and strong product value",
        "Social proof and lifestyle relevance",
        "Feature-to-benefit storytelling",
        "Consistent CTA across channels",
      ],
      landing_page_headline: `Meet ${name}, the smarter way for ${audience}.`,
      product_description: userInput.product_description,
      email_copy: `Introducing ${name}. Designed for ${audience}, it helps you achieve ${userInput.campaign_goal}. Start your launch with a message that is simple, credible, and action-driven.`,
      ad_headlines: [
        `Why ${audience} are switching to ${name}`,
        `${name}: The smarter launch choice`,
        `Built for ${audience}, ready today`,
        `Turn interest into action with ${name}`,
        `${name} is here. Launch stronger.`,
      ],
      video_storyboard: [
        { title: "Scene 1", body: `Open on the pain point ${audience} face today.` },
        { title: "Scene 2", body: `Introduce ${name} as the clear, modern solution.` },
        { title: "Scene 3", body: "Show key benefits in fast visual cuts." },
        { title: "Scene 4", body: "Add a short testimonial-style confidence moment." },
        { title: "Scene 5", body: `Close with CTA tailored to ${userInput.campaign_goal}.` },
      ],
      narration_script: `${name} helps ${audience} move faster from problem to progress. With a ${style} tone and clear benefits, this campaign drives awareness and action across every touchpoint.`,
      social_captions: {
        Instagram: `${name} is built for ${audience}. Save this for launch week.`,
        TikTok: `POV: You found ${name} before everyone else.`,
        LinkedIn: `Launching ${name} for ${audience} with a focused multi-channel strategy.`,
      },
      hashtags: ["#Launch", "#Marketing", "#AI", "#Brand", "#Growth", "#Campaign", "#ProductLaunch"],
      content_calendar_ideas: [
        "Founder story post",
        "Problem/solution explainer carousel",
        "Feature spotlight short video",
        "Customer objection FAQ",
        "Behind-the-scenes build story",
        "Comparison post",
        "Launch day CTA post",
      ],
      performance_prediction:
        "Expected outcome: stronger awareness in week one, improving CTR as creative variants are tested. With consistent posting cadence and CTA clarity, conversion intent should improve over the first 2-3 weeks.",
    };
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

module.exports = { GeminiService, QuotaExceededError };
