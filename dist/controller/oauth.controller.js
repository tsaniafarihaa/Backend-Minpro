"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthController = void 0;
const prisma_1 = __importDefault(require("../prisma")); // Adjust the path as needed
const supabase_1 = require("../supabase");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto_1 = require("crypto");
const base_url_fe = process.env.BASE_URL_FE;
if (!base_url_fe || !process.env.JWT_KEY) {
    throw new Error("Required environment variables are missing.");
}
function isError(err) {
    return err instanceof Error;
}
class OAuthController {
    /**
     * Initiate Google OAuth Login
     */
    loginWithGoogle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabase_1.supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: `${base_url_fe}/callback`,
                    },
                });
                if (error || !(data === null || data === void 0 ? void 0 : data.url)) {
                    console.error("Error initiating Google login:", (error === null || error === void 0 ? void 0 : error.message) || error);
                    res.status(400).json({ message: "Failed to initiate Google login", error });
                    return;
                }
                res.status(200).json({ url: data.url });
            }
            catch (err) {
                if (isError(err)) {
                    console.error("Error in loginWithGoogle:", err.message, err.stack);
                }
                else {
                    console.error("Unknown error in loginWithGoogle:", err);
                }
                res.status(500).json({ message: "Internal server error" });
            }
        });
    }
    /**
     * Handle Google OAuth Callback
     */
    handleGoogleCallback(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { access_token } = req.query;
                if (!access_token) {
                    res.status(400).json({ message: "Missing access token in the callback" });
                    return;
                }
                const { data, error } = yield supabase_1.supabase.auth.getUser(access_token);
                if (error || !(data === null || data === void 0 ? void 0 : data.user)) {
                    res.status(400).json({ message: "Failed to retrieve user data", error });
                    return;
                }
                const user = data.user;
                if (!(user === null || user === void 0 ? void 0 : user.email)) {
                    res.status(400).json({ message: "Invalid user data from OAuth" });
                    return;
                }
                let existingUser = yield prisma_1.default.user.findUnique({
                    where: { email: user.email },
                });
                if (!existingUser) {
                    existingUser = yield prisma_1.default.user.create({
                        data: {
                            username: ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.full_name) || user.email.split("@")[0],
                            email: user.email,
                            password: (0, crypto_1.randomBytes)(16).toString("hex"),
                            isVerify: true,
                        },
                    });
                }
                const payload = { id: existingUser.id, email: existingUser.email, type: "user" };
                const jwtToken = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                res.redirect(`${base_url_fe}/callback#access_token=${jwtToken}`);
            }
            catch (err) {
                if (isError(err)) {
                    console.error("Error in handleGoogleCallback:", err.message, err.stack);
                }
                else {
                    console.error("Unknown error in handleGoogleCallback:", err);
                }
                res.status(500).json({ message: "Internal server error" });
            }
        });
    }
    /**
     * Process Access Token for User Info
     */
    processAccessToken(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { access_token } = req.body;
                if (!access_token) {
                    res.status(400).json({ message: "Access token is missing." });
                    return;
                }
                const userInfo = yield fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`)
                    .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch user info from Google API");
                    }
                    return response.json();
                })
                    .catch((err) => {
                    console.error("Error fetching user info:", err);
                    res.status(400).json({ message: "Invalid token or user data." });
                    throw err;
                });
                if (!(userInfo === null || userInfo === void 0 ? void 0 : userInfo.email)) {
                    res.status(400).json({ message: "Invalid token or user data." });
                    return;
                }
                let user = yield prisma_1.default.user.findUnique({
                    where: { email: userInfo.email },
                });
                if (!user) {
                    user = yield prisma_1.default.user.create({
                        data: {
                            username: userInfo.name || userInfo.email.split("@")[0],
                            email: userInfo.email,
                            password: (0, crypto_1.randomBytes)(16).toString("hex"),
                            isVerify: true,
                        },
                    });
                }
                const payload = { id: user.id, email: user.email, type: "user" };
                const jwtToken = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                res.status(200).json({
                    message: "Access token processed successfully.",
                    token: jwtToken,
                });
            }
            catch (err) {
                if (isError(err)) {
                    console.error("Error in processAccessToken:", err.message, err.stack);
                }
                else {
                    console.error("Unknown error in processAccessToken:", err);
                }
                res.status(500).json({ message: "Internal server error" });
            }
        });
    }
}
exports.OAuthController = OAuthController;
