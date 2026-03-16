const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const config = {
  appName: process.env.APP_NAME || "AI Marketing Campaign Maker API",
  appVersion: process.env.APP_VERSION || "1.0.0",
  env: process.env.ENV || "dev",
  corsOrigins: process.env.CORS_ORIGINS || "*",

  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || "",
  googleCloudRegion: process.env.GOOGLE_CLOUD_REGION || "us-central1",
  gcsBucketName: process.env.GCS_BUCKET_NAME || "",

  geminiUseVertex: (process.env.GEMINI_USE_VERTEX || "true").toLowerCase() === "true",
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash",
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation",

  geminiApiKey: process.env.GEMINI_API_KEY || "",

  firestoreCollection: process.env.FIRESTORE_COLLECTION || "campaigns",

  port: parseInt(process.env.PORT || "8080", 10),
};

module.exports = config;
