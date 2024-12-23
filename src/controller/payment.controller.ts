// src/controller/payment.controller.ts
import { Request, Response } from "express";
import prisma from "../prisma";
import type { Status } from "@prisma/client";

// This will not show TypeScript error when using require
type MidtransSnap = {
  createTransaction(params: any): Promise<{ token: string }>;
  transaction: {
    notification(notification: any): Promise<any>;
  };
};

const midtransClient = require("midtrans-client");

interface UserRequest extends Request {
  user?: {
    id: string;
  };
}

export class PaymentController {
  private snap: any;

  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  createPayment = async (req: UserRequest, res: Response) => {
    try {
      const {
        eventId,
        ticketId,
        quantity,
        usePoints,
        useCoupon,
        totalPrice,
        finalPrice,
      } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          usercoupon: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate points usage
      if (usePoints) {
        const pointsToUse = totalPrice - finalPrice;
        if (pointsToUse > user.points) {
          return res.status(400).json({ error: "Insufficient points" });
        }
        if (pointsToUse % 10000 !== 0) {
          return res
            .status(400)
            .json({ error: "Points must be in multiples of 10,000" });
        }
      }

      // Validate coupon usage
      if (useCoupon) {
        if (!user.usercoupon || user.usercoupon.expiredAt < new Date()) {
          return res.status(400).json({ error: "Invalid or expired coupon" });
        }
      }

      // Create Order
      const newOrder = await prisma.order.create({
        data: {
          totalPrice,
          finalPrice,
          paymentProof: null,
          status: "PENDING" as Status,
          userId,
          eventId: Number(eventId),
          details: {
            create: {
              quantity: Number(quantity),
              tickets: {
                connect: { id: Number(ticketId) },
              },
              ...(useCoupon && user.usercoupon
                ? { UserCoupon: { connect: { id: user.usercoupon.id } } }
                : {}),
            },
          },
        },
        include: {
          user: true,
          details: true,
        },
      });

      // If using points, deduct them
      if (usePoints) {
        const pointsUsed = totalPrice - finalPrice;
        await prisma.user.update({
          where: { id: userId },
          data: {
            points: {
              decrement: pointsUsed,
            },
          },
        });
      }

      // Get payment token from Midtrans
      const parameter = {
        transaction_details: {
          order_id: `ORDER-${newOrder.id}`,
          gross_amount: finalPrice,
        },
        credit_card: {
          secure: true,
        },
        customer_details: {
          first_name: user.username,
          email: user.email,
        },
      };

      const transaction = await this.snap.createTransaction(parameter);

      // Update order with payment token
      await prisma.order.update({
        where: { id: newOrder.id },
        data: {
          paymentProof: `ORDER-${newOrder.id}`,
        },
      });

      return res.status(200).json({
        token: transaction.token,
        orderId: newOrder.id,
      });
    } catch (error) {
      console.error("Payment creation error:", error);
      return res.status(500).json({
        error: "Failed to create payment",
      });
    }
  };

  handleNotification = async (req: Request, res: Response) => {
    try {
      const notification = await this.snap.transaction.notification(req.body);
      const orderId = notification.order_id.replace("ORDER-", "");
      const transactionStatus = notification.transaction_status;

      // Update order status
      const status: Status =
        transactionStatus === "settlement" || transactionStatus === "capture"
          ? "PAID"
          : transactionStatus === "pending"
          ? "PENDING"
          : "CANCELED";

      const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        include: {
          details: {
            include: {
              tickets: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      await prisma.order.update({
        where: { id: Number(orderId) },
        data: { status },
      });

      // Handle post-payment actions based on status
      if (status === "PAID") {
        // Update ticket quantities
        for (const detail of order.details) {
          for (const ticket of detail.tickets) {
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                quantity: {
                  decrement: detail.quantity,
                },
              },
            });
          }
        }
      }

      // Refund points if payment is canceled
      if (status === "CANCELED" && order.userId) {
        const pointsUsed = order.totalPrice - order.finalPrice;
        if (pointsUsed > 0) {
          await prisma.user.update({
            where: { id: order.userId },
            data: {
              points: {
                increment: pointsUsed,
              },
            },
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Notification handling error:", error);
      return res.status(500).json({
        error: "Failed to handle notification",
      });
    }
  };
}
