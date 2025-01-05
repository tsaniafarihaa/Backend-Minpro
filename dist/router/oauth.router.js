"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthRouter = void 0;
const express_1 = require("express");
const oauth_controller_1 = require("../controller/oauth.controller");
class OAuthRouter {
    constructor() {
        this.oauthController = new oauth_controller_1.OAuthController();
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get("/login/google", this.oauthController.loginWithGoogle);
        this.router.get("/callback", this.oauthController.handleGoogleCallback);
    }
    getRouter() {
        return this.router;
    }
}
exports.OAuthRouter = OAuthRouter;
