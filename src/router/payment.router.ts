import { Router } from "express";
import { PaymentController } from "../controller/payment.controller";
import { verifyTokenUser } from "../middleware/verify.user";

export class PaymentRouter {
  private router: Router;
  private paymentController: PaymentController;

  constructor() {
    this.paymentController = new PaymentController();
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Create order route
    this.router.post(
      "/orders",
      verifyTokenUser,
      this.paymentController.createOrder.bind(this.paymentController)
    );

    // Update order status route
    this.router.patch(
      "/orders/:orderId/status",
      verifyTokenUser,
      this.paymentController.updateOrderStatus.bind(this.paymentController)
    );
  }

  getRouter(): Router {
    return this.router;
  }
}
