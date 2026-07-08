import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { envConfig } from "./config/env.config";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import { connectDatabase } from "./config/database.config";

import passport from "./config/passport.config";
import routes from "./routes";
import webhookRouter from "./routes/webhook.route";

const app = express();

// Webhook route FIRST - needs raw body for Stripe signature verification
app.use("/api/webhook", webhookRouter);

const allowedOrigins = [
  envConfig.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

app.get("/health", asyncHandler(
  async (_req, res) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is running",
      status: "healthy",
    });
  })
);

app.use("/api", routes);

app.use(errorHandler);

const PORT = envConfig.PORT || 8000;

app.listen(PORT, async () => {
  await connectDatabase();
  console.log(`Server running on port ${PORT} in ${envConfig.NODE_ENV} mode`);
});
