const { v4: uuidv4 } = require("uuid");
const fs = require("fs/promises");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const config = require("../config");
const { GeminiService, QuotaExceededError } = require("./geminiService");

class CampaignGenerator {
  constructor() {
    this.gemini = new GeminiService();
    this.firestore = config.googleCloudProject ? new Firestore({ projectId: config.googleCloudProject }) : null;
    this.storage = config.googleCloudProject ? new Storage({ projectId: config.googleCloudProject }) : null;
  }

  /**
   * Upload image bytes to GCS and return URIs.
   * @param {string} campaignId
   * @param {string} assetType
   * @param {Buffer} imageBytes
   * @returns {Promise<{gcs_uri: string, public_url: string}>}
   */
  async _uploadImage(campaignId, assetType, imageBytes) {
    if (!config.geminiUseVertex || !config.gcsBucketName || !this.storage) {
      return {
        gcs_uri: null,
        public_url: CampaignGenerator._buildInlineImageUrl(imageBytes),
      };
    }

    const bucket = this.storage.bucket(config.gcsBucketName);
    const filePath = `campaigns/${campaignId}/${assetType}.png`;
    const file = bucket.file(filePath);

    try {
      await file.save(imageBytes, { contentType: "image/png" });
      await file.makePublic();

      return {
        gcs_uri: `gs://${config.gcsBucketName}/${filePath}`,
        public_url: `https://storage.googleapis.com/${config.gcsBucketName}/${filePath}`,
      };
    } catch (err) {
      if (CampaignGenerator._isGoogleAuthError(err)) {
        return {
          gcs_uri: null,
          public_url: CampaignGenerator._buildInlineImageUrl(imageBytes),
        };
      }
      throw err;
    }
  }

  static _buildInlineImageUrl(imageBytes) {
    return `data:image/png;base64,${imageBytes.toString("base64")}`;
  }

  static _isGoogleAuthError(err) {
    const message = String(err?.message || "");
    return (
      message.includes("Could not load the default credentials") ||
      message.includes("Could not refresh access token") ||
      message.includes("Unable to detect a Project Id")
    );
  }

  _campaignFilePath(campaignId) {
    return path.join(config.campaignStorageDir, `${campaignId}.json`);
  }

  async _persistLocally(campaignId, response) {
    await fs.mkdir(config.campaignStorageDir, { recursive: true });
    await fs.writeFile(this._campaignFilePath(campaignId), JSON.stringify(response, null, 2), "utf8");
    return "local_file";
  }

  async _loadLocalCampaign(campaignId) {
    try {
      const raw = await fs.readFile(this._campaignFilePath(campaignId), "utf8");
      return JSON.parse(raw);
    } catch (err) {
      if (err && err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  async _persistCampaign(campaignId, response) {
    if (!config.geminiUseVertex || !this.firestore) {
      response.metadata.storage_mode = "local_file";
      await this._persistLocally(campaignId, response);
      return "local_file";
    }

    try {
      response.metadata.storage_mode = "firestore";
      await this.firestore
        .collection(config.firestoreCollection)
        .doc(campaignId)
        .set(response);
      return "firestore";
    } catch (err) {
      if (CampaignGenerator._isGoogleAuthError(err)) {
        response.metadata.storage_mode = "local_file";
        await this._persistLocally(campaignId, response);
        return "local_file";
      }
      throw err;
    }
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
    let campaignJson;
    let usingMockContent = false;

    try {
      campaignJson = await this.gemini.generateCampaignJson(prompt);
    } catch (err) {
      if (err instanceof QuotaExceededError && config.geminiMockOnQuotaExceeded) {
        usingMockContent = true;
        campaignJson = GeminiService.buildMockCampaignJson(payload);
      } else {
        throw err;
      }
    }

    const visualAssets = [];
    const imagePrompts = GeminiService.buildImagePrompts(campaignJson, payload.product_name);

    for (const assetReq of imagePrompts) {
      if (usingMockContent) {
        visualAssets.push({
          type: assetReq.type,
          prompt: `[Mock asset] ${assetReq.prompt}`,
          gcs_uri: null,
          public_url: null,
        });
        continue;
      }

      try {
        const imageBytes = await this.gemini.generateImageBytes(assetReq.prompt);
        const uploaded = await this._uploadImage(campaignId, assetReq.type, imageBytes);
        visualAssets.push({
          type: assetReq.type,
          prompt: assetReq.prompt,
          gcs_uri: uploaded.gcs_uri,
          public_url: uploaded.public_url,
        });
      } catch (err) {
        if (err instanceof QuotaExceededError && config.geminiMockOnQuotaExceeded) {
          visualAssets.push({
            type: assetReq.type,
            prompt: `[Mock asset] ${assetReq.prompt}`,
            gcs_uri: null,
            public_url: null,
          });
          continue;
        }
        throw err;
      }
    }

    const createdAt = new Date().toISOString();
    const response = {
      campaign_id: campaignId,
      created_at: createdAt,
      input: payload,
      metadata: {
        used_mock_content: usingMockContent,
        generation_mode: config.geminiUseVertex ? "vertex" : "api_key",
        image_provider: config.imageProvider,
      },
      content: campaignJson,
      visual_assets: visualAssets,
      interleaved_output: CampaignGenerator._buildInterleavedOutput(campaignJson, visualAssets),
    };

    await this._persistCampaign(campaignId, response);

    return response;
  }

  /**
   * Retrieve a campaign by ID from Firestore.
   * @param {string} campaignId
   * @returns {Promise<Object>}
   */
  async getCampaign(campaignId) {
    const localCampaign = await this._loadLocalCampaign(campaignId);
    if (localCampaign) {
      return localCampaign;
    }

    if (!this.firestore) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }

    try {
      const doc = await this.firestore
        .collection(config.firestoreCollection)
        .doc(campaignId)
        .get();

      if (!doc.exists) {
        throw new NotFoundError(`Campaign ${campaignId} not found`);
      }
      return doc.data();
    } catch (err) {
      if (CampaignGenerator._isGoogleAuthError(err)) {
        throw new NotFoundError(`Campaign ${campaignId} not found`);
      }
      throw err;
    }
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

module.exports = { CampaignGenerator, NotFoundError };
