const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
const requestedVertexMode = (process.env.GEMINI_USE_VERTEX || "").trim().toLowerCase();
const geminiUseVertex =
  requestedVertexMode === "true" ? !geminiApiKey : requestedVertexMode === "false" ? false : !geminiApiKey;
const huggingFaceApiKey = (process.env.HUGGING_FACE_API_KEY || "").trim();
const requestedImageProvider = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
const imageProvider = requestedImageProvider || (huggingFaceApiKey ? "huggingface" : "gemini");

const config = {
  appName: process.env.APP_NAME || "BriefToBrand API",
  appVersion: process.env.APP_VERSION || "1.0.0",
  env: process.env.ENV || "dev",
  corsOrigins: process.env.CORS_ORIGINS || "*",

  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || "",
  googleCloudRegion: process.env.GOOGLE_CLOUD_REGION || "us-central1",
  gcsBucketName: process.env.GCS_BUCKET_NAME || "",

  geminiUseVertex,
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash",
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation",

  geminiApiKey,
  imageProvider,
  huggingFaceApiKey,
  huggingFaceImageModel:
    process.env.HUGGING_FACE_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0",
  geminiMockOnQuotaExceeded:
    (process.env.GEMINI_MOCK_ON_QUOTA_EXCEEDED || (process.env.ENV === "dev" ? "true" : "false"))
      .toLowerCase() === "true",

  firestoreCollection: process.env.FIRESTORE_COLLECTION || "campaigns",
  campaignStorageDir: process.env.CAMPAIGN_STORAGE_DIR || path.resolve(__dirname, "..", "data", "campaigns"),

  port: parseInt(process.env.PORT || "8080", 10),
};

module.exports = config;
