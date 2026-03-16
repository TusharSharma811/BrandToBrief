const express = require("express");
const cors = require("cors");
const config = require("./config");
const campaignRoutes = require("./routes/campaigns");

const app = express();

// ─── CORS ───────────────────────────────────────────────────────────────────
const origins = config.corsOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowAnyOrigin = origins.length === 0 || origins.includes("*");

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowAnyOrigin || origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: !allowAnyOrigin,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: config.appName });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/v1/campaigns", campaignRoutes);

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`${config.appName} v${config.appVersion} listening on port ${config.port}`);
});
