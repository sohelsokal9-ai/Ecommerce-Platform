import { Router } from "express";
import {
  registerController,
  loginController,
  logoutController,
  authStatusController,
} from "../controllers/auth.controller";
import { passportAuthenticateJwt } from "../config/passport.config";
import { rateLimitLogin } from "../middlewares/rateLimit.middleware";

const authRoutes = Router();

authRoutes.post("/register", rateLimitLogin, registerController);
authRoutes.post("/login", rateLimitLogin, loginController);
authRoutes.post("/logout", logoutController);
authRoutes.get("/status", passportAuthenticateJwt, authStatusController);

export default authRoutes;
