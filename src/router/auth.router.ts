import { Router } from "express";
import { AuthController } from "../controller/auth.controller";
import { verifyToken } from "../middleware/verify";
import { verifyTokenPromotor } from "../middleware/verify.promotor";


export class AuthRouter {
  private authController: AuthController;
  private router: Router;

  constructor() {
    this.authController = new AuthController();
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    //FOR USER // Nanti buatlagi /protected untuk route pembayaran pakai verifyToken
   this.router.post("/login", this.authController.loginUser)
   this.router.post("/register", this.authController.registerUser)

   //FOR PROMOTOR
   this.router.post("/promotorRegister", this.authController.registerPromotor)
   this.router.post("/promotorLogin",this.authController.loginPromotor)
   this.router.patch("/verify/:token", this.authController.verifyPromotor)
  }

  public getRouter(): Router {
    return this.router;
  }
}
