// src/routes/payment.router.ts
import { Router } from "express";
import { PaymentController } from "../controller/payment.controller";
import { verifyToken } from "../middleware/verify";
import { Request, Response } from "express";

const router = Router();
const paymentController = new PaymentController();

// Create payment route
router.post("/create", verifyToken, (req: Request, res: Response) => {
  paymentController.createPayment(req, res);
});

// Midtrans notification webhook
router.post("/notification", (req: Request, res: Response) => {
  console.log("Received notification:", req.body);
  paymentController.handleNotification(req, res);
});

// Check coupon availability for an event
router.get(
  "/check-coupon/:eventId",
  verifyToken,
  (req: Request, res: Response) => {
    paymentController.checkCouponAvailability(req, res);
  }
);

// Get total coupon usage count for an event
router.get(
  "/coupon-count/:eventId",
  verifyToken,
  (req: Request, res: Response) => {
    paymentController.getCouponCount(req, res);
  }
);

// Check if user has valid coupon
router.get("/check-user-coupon", verifyToken, (req: Request, res: Response) => {
  paymentController.checkUserCoupon(req, res);
});

// Update order status
router.post("/update-status", verifyToken, (req: Request, res: Response) => {
  paymentController.updateOrderStatus(req, res);
});

// Send success email after payment
router.post(
  "/success-email-order/:orderId",
  verifyToken,
  (req: Request, res: Response) => {
    paymentController.sendSuccessEmail(req, res);
  }
);

// Get order status and payment details
router.get("/order/:orderId", verifyToken, (req: Request, res: Response) => {
  paymentController.getOrderStatus(req, res);
});

export default router;
