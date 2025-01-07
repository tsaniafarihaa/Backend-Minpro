import { Request, Response } from "express";
import prisma from "../prisma";
import { midtransService } from "../services/midtrans";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";
import { transporter } from "../services/mailer";
import { format } from "date-fns";

export class PaymentController {
  async createPayment(req: Request, res: Response) {
    try {
      const { orderId } = req.body;
      const userId = req.user?.id;

      if (!orderId || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          userId,
          status: "PENDING",
        },
        include: {
          user: {
            include: { usercoupon: true },
          },
          event: true,
          details: {
            include: {
              tickets: true,
              UserCoupon: true,
            },
          },
        },
      });

      if (!order || !order.event || !order.user) {
        return res
          .status(404)
          .json({ message: "Order not found or incomplete" });
      }

      // Get the first order detail and ticket
      const orderDetail = order.details[0];
      if (!orderDetail || !orderDetail.tickets[0]) {
        return res.status(404).json({ message: "Ticket details not found" });
      }

      const ticket = orderDetail.tickets[0];
      const eachPrice = order.finalPrice / orderDetail.quantity;

      const transaction = await midtransService.createTransaction({
        orderId: `ORDER-${order.id}`,
        amount: order.finalPrice,
        itemDetails: [
          {
            id: ticket.id.toString(),
            price: eachPrice,
            quantity: orderDetail.quantity,
            name: `${order.event.title} - ${ticket.category}`,
          },
        ],
        customerDetails: {
          firstName: order.user.username,
          email: order.user.email,
        },
        callbacks: {
          finish: `${process.env.BASE_URL_FE}/payment/success?order_id=ORDER-${order.id}`,
          error: `${process.env.BASE_URL_FE}/payment/failed?order_id=ORDER-${order.id}`,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentProof: transaction.redirect_url,
        },
      });

      return res.status(200).json({
        message: "Payment initiated",
        data: {
          paymentUrl: transaction.redirect_url,
          token: transaction.token,
        },
      });
    } catch (error) {
      console.error("Payment creation error:", error);
      return res.status(500).json({
        message: "Failed to create payment",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async handleNotification(req: Request, res: Response) {
    try {
      const notification = await midtransService.handleNotification(req.body);

      const orderId = notification.order_id.replace("ORDER-", "");
      const transactionStatus = notification.transaction_status;

      let status: "PENDING" | "PAID" | "CANCELED" = "PENDING";

      if (
        transactionStatus === "settlement" ||
        transactionStatus === "capture" ||
        transactionStatus === "success"
      ) {
        status = "PAID";
      } else if (
        transactionStatus === "deny" ||
        transactionStatus === "cancel" ||
        transactionStatus === "expire" ||
        transactionStatus === "failure"
      ) {
        status = "CANCELED";
      }

      const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        include: {
          details: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Update order status
      await prisma.order.update({
        where: { id: Number(orderId) },
        data: { status },
      });

      // If order is canceled and used a coupon, revert coupon usage
      if (status === "CANCELED" && order.details[0]?.userCouponId) {
        await prisma.userCoupon.update({
          where: { id: order.details[0].userCouponId },
          data: { isRedeem: true },
        });
      }

      return res.status(200).json({
        message: "Notification processed",
        orderId,
        status,
        transactionStatus,
      });
    } catch (error) {
      console.error("Notification error:", error);
      return res.status(500).json({ message: "Failed to handle notification" });
    }
  }

  async getCouponCount(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.eventId);

      if (!eventId) {
        return res.status(400).json({ message: "Missing event ID" });
      }

      const count = await prisma.orderDetail.count({
        where: {
          order: {
            eventId: eventId,
            NOT: {
              status: "CANCELED",
            },
          },
          userCouponId: {
            not: null,
          },
        },
      });

      return res.status(200).json({ count });
    } catch (error) {
      console.error("Get coupon count error:", error);
      return res.status(500).json({ message: "Failed to get coupon count" });
    }
  }

  async checkUserCoupon(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { usercoupon: true },
      });

      const canUseCoupon = Boolean(
        user?.usercoupon && !user.usercoupon.isRedeem && user?.percentage
      );

      return res.status(200).json({ canUseCoupon });
    } catch (error) {
      console.error("Check user coupon error:", error);
      return res.status(500).json({ message: "Failed to check user coupon" });
    }
  }

  async checkCouponAvailability(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user?.id;

      if (!eventId || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { usercoupon: true },
      });

      // Tambahkan log ini
      console.log("User data:", {
        userId,
        hasCoupon: !!user?.usercoupon,
        isRedeem: user?.usercoupon?.isRedeem,
        percentage: user?.percentage,
      });

      if (!user?.usercoupon) {
        return res.status(200).json({
          canUseCoupon: false,
          couponUsageCount: 0,
          remainingCoupons: 0,
          message: "No coupon available",
        });
      }

      // Check if coupon is already used
      if (user.usercoupon.isRedeem === true) {
        return res.status(200).json({
          canUseCoupon: false,
          couponUsageCount: 0,
          remainingCoupons: 0,
          message: "Your coupon has already been used",
        });
      }

      // Count total coupon usage for this event
      const couponUseCount = await prisma.orderDetail.count({
        where: {
          order: {
            eventId: eventId,
            NOT: {
              status: "CANCELED",
            },
          },
          userCouponId: {
            not: null,
          },
        },
      });

      // Check if event has reached coupon limit
      if (couponUseCount >= 10) {
        return res.status(200).json({
          canUseCoupon: false,
          couponUsageCount: couponUseCount,
          remainingCoupons: 0,
          message: "Event has reached maximum coupon usage",
        });
      }

      return res.status(200).json({
        canUseCoupon: true,
        couponUsageCount: couponUseCount,
        remainingCoupons: Math.max(0, 10 - couponUseCount),
      });
    } catch (error) {
      console.error("Coupon check error:", error);
      return res.status(500).json({
        message: "Failed to check coupon availability",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId, status } = req.body;

      if (!orderId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
        include: {
          details: true,
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status: status as "PENDING" | "PAID" | "CANCELED",
        },
      });

      // If order is canceled and used a coupon, revert coupon usage
      if (status === "CANCELED" && order.details[0]?.userCouponId) {
        await prisma.userCoupon.update({
          where: { id: order.details[0].userCouponId },
          data: { isRedeem: true },
        });
      }

      return res.status(200).json({
        message: "Order status updated",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      return res.status(500).json({ message: "Failed to update order status" });
    }
  }

  async sendSuccessEmail(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const userId = req.user?.id;

      const userData = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!userData || !userData.email) {
        return res.status(400).json({ message: "User data not found" });
      }

      const orderData = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
        },
        include: {
          event: true,
          details: {
            include: {
              tickets: true,
              UserCoupon: true,
            },
          },
        },
      });

      if (!orderData || !orderData.event) {
        return res.status(404).json({ message: "Order data not found" });
      }

      const templatePath = path.join(
        __dirname,
        "../templates",
        "orderSuccess.hbs"
      );
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateSource);

      const formattedDate = format(
        new Date(orderData.event.date ?? ""),
        "dd MMMM yyyy HH:mm a"
      );

      const html = compiledTemplate({
        username: userData.username,
        concertName: orderData.event.title,
        categoryName: orderData.details[0]?.tickets[0]?.category,
        concertDate: formattedDate,
        concertLocation: orderData.event.location,
        discountApplied: orderData.details[0]?.UserCoupon ? "Yes" : "No",
        finalPrice: orderData.finalPrice.toLocaleString("id-ID", {
          style: "currency",
          currency: "IDR",
        }),
      });

      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: userData.email,
        subject: "Your TIKO Order Confirmation",
        html,
      });

      return res.status(200).json({
        message: "Success",
        detail: "Order confirmation email sent successfully",
      });
    } catch (error) {
      console.error("Send success email error:", error);
      return res.status(500).json({
        message: "Failed to send email",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!orderId || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const order = await prisma.order.findFirst({
        where: {
          id: Number(orderId),
          userId,
        },
        include: {
          event: true,
          details: {
            include: {
              tickets: true,
              UserCoupon: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const midtransStatus = await midtransService.getStatus(
        `ORDER-${orderId}`
      );

      return res.status(200).json({
        order,
        paymentStatus: midtransStatus,
      });
    } catch (error) {
      console.error("Get order status error:", error);
      return res.status(500).json({
        message: "Failed to get payment status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
