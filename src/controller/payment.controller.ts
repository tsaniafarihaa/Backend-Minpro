import { Request, Response } from "express";
import { PaymentService } from "../services/payment.service";
import { Status } from "../../prisma/generated/client";

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  createOrder = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Validate request body
      const { eventId, totalPrice, finalPrice, pointsUsed, details } = req.body;
      if (!eventId || !totalPrice || !finalPrice || !details) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const orderResult = await this.paymentService.createOrder({
        userId,
        eventId,
        totalPrice,
        finalPrice,
        pointsUsed,
        details: {
          quantity: details.quantity,
          userCouponId: details.userCouponId,
          tickets: details.tickets,
        },
      });

      res.status(201).json(orderResult);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!Object.values(Status).includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const updatedOrder = await this.paymentService.updateOrderStatus(
        parseInt(orderId),
        status as Status,
        userId
      );

      res.status(200).json({
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        message: "Failed to update order status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
