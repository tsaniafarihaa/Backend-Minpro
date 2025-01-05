import { Router } from "express";
import { OAuthController } from "../controller/oauth.controller";

export class OAuthRouter {
  private oauthController: OAuthController;
  private router: Router;

  constructor() {
    this.oauthController = new OAuthController();
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/login/google", this.oauthController.loginWithGoogle);
    this.router.get("/callback", this.oauthController.handleGoogleCallback);
  }

  public getRouter(): Router {
    return this.router;
  }
}
