const { v4: uuidv4 } = require("uuid");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const config = require("../config");
const GeminiService = require("./geminiService");

class CampaignGenerator {
  constructor() {
    this.gemini = new GeminiService();
    this.firestore = new Firestore({ projectId: config.googleCloudProject });
    this.storage = new Storage({ projectId: config.googleCloudProject });
  }

  /**
   * Upload image bytes to GCS and return URIs.
   * @param {string} campaignId
   * @param {string} assetType
   * @param {Buffer} imageBytes
   * @returns {Promise<{gcs_uri: string, public_url: string}>}
   */
  async _uploadImage(campaignId, assetType, imageBytes) {
    if (!config.gcsBucketName) {
      throw new Error("GCS_BUCKET_NAME is required for visual asset storage.");
    }

    const bucket = this.storage.bucket(config.gcsBucketName);
    const filePath = `campaigns/${campaignId}/${assetType}.png`;
    const file = bucket.file(filePath);

    await file.save(imageBytes, { contentType: "image/png" });
    await file.makePublic();

    return {
      gcs_uri: `gs://${config.gcsBucketName}/${filePath}`,
      public_url: `https://storage.googleapis.com/${config.gcsBucketName}/${filePath}`,
    };
  }

  /**
   * Build interleaved text/image output array.
   * @param {Object} content
   * @param {Array} assets
   * @returns {Array}
   */
  static _buildInterleavedOutput(content, assets) {
    const assetMap = {};
    for (const asset of assets) {
      assetMap[asset.type] = asset;
    }

    return [
      { type: "text", section: "concept", data: content.concept },
      {
        type: "image",
        section: "hero_image",
        data: assetMap.hero_image ? assetMap.hero_image.public_url : null,
      },
      { type: "text", section: "messaging_pillars", data: content.messaging_pillars },
      {
        type: "image",
        section: "instagram_creative",
        data: assetMap.instagram_creative ? assetMap.instagram_creative.public_url : null,
      },
      { type: "text", section: "ad_headlines", data: content.ad_headlines },
      {
        type: "image",
        section: "poster",
        data: assetMap.poster ? assetMap.poster.public_url : null,
      },
      {
        type: "text",
        section: "video_storyboard",
        data: content.video_storyboard,
      },
      {
        type: "image",
        section: "storyboard_keyframe",
        data: assetMap.storyboard_keyframe ? assetMap.storyboard_keyframe.public_url : null,
      },
      { type: "text", section: "social_captions", data: content.social_captions },
    ];
  }

  /**
   * Full campaign generation pipeline.
   * @param {Object} payload - Validated campaign request
   * @returns {Promise<Object>} - Campaign response matching CampaignResponse schema
   */
  async generate(payload) {
    const campaignId = uuidv4();
    const prompt = GeminiService.buildCampaignPrompt(payload);
    const campaignJson = await this.gemini.generateCampaignJson(prompt);

    const visualAssets = [];
    const imagePrompts = GeminiService.buildImagePrompts(campaignJson, payload.product_name);

    for (const assetReq of imagePrompts) {
      const imageBytes = await this.gemini.generateImageBytes(assetReq.prompt);
      const uploaded = await this._uploadImage(campaignId, assetReq.type, imageBytes);
      visualAssets.push({
        type: assetReq.type,
        prompt: assetReq.prompt,
        gcs_uri: uploaded.gcs_uri,
        public_url: uploaded.public_url,
      });
    }

    const createdAt = new Date().toISOString();
    const response = {
      campaign_id: campaignId,
      created_at: createdAt,
      input: payload,
      content: campaignJson,
      visual_assets: visualAssets,
      interleaved_output: CampaignGenerator._buildInterleavedOutput(campaignJson, visualAssets),
    };

    // Persist to Firestore
    await this.firestore
      .collection(config.firestoreCollection)
      .doc(campaignId)
      .set(response);

    return response;
  }

  /**
   * Retrieve a campaign by ID from Firestore.
   * @param {string} campaignId
   * @returns {Promise<Object>}
   */
  async getCampaign(campaignId) {
    const doc = await this.firestore
      .collection(config.firestoreCollection)
      .doc(campaignId)
      .get();

    if (!doc.exists) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }
    return doc.data();
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

module.exports = { CampaignGenerator, NotFoundError };
