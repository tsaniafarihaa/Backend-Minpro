// src/router/payment.router.ts
import { Router, Request, Response } from "express";
import { PaymentController } from "../controller/payment.controller";
import { verifyTokenUser } from "../middleware/verify.user";

export class PaymentRouter {
  private router: Router;
  private paymentController: PaymentController;

  constructor() {
    this.router = Router();
    this.paymentController = new PaymentController();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/create",
      verifyTokenUser,
      async (req: Request, res: Response) => {
        try {
          await this.paymentController.createPayment(req, res);
        } catch (error) {
          res.status(500).json({ error: "Payment creation failed" });
        }
      }
    );

    this.router.post("/notification", async (req: Request, res: Response) => {
      try {
        await this.paymentController.handleNotification(req, res);
      } catch (error) {
        res.status(500).json({ error: "Notification handling failed" });
      }
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
