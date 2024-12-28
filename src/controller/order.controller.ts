import { Request, Response } from "express";
import prisma from "../prisma";
import { OrderPayload } from "../custom";

export class OrderController {
  async createOrder(req: Request<{}, {}, OrderPayload>, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const {
        ticketId,
        quantity,
        totalPrice,
        finalPrice,
        pointsRedeemed,
        percentage,
      } = req.body;

      // Validate inputs
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient tickets" });
      }

      if (quantity > 4) {
        return res
          .status(400)
          .json({ message: "Maximum 4 tickets per purchase" });
      }

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get user with coupon info
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { usercoupon: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Validate points redemption
        if (pointsRedeemed) {
          if (pointsRedeemed > user.points) {
            throw new Error("Insufficient points");
          }
          if (pointsRedeemed % 10000 !== 0) {
            throw new Error("Points must be in multiples of 10,000");
          }
        }

        // Calculate expected price
        let expectedPrice = totalPrice;
        if (percentage && user.usercoupon) {
          const currentDate = new Date();
          const expiryDate = new Date(user.usercoupon.expiredAt);

          if (currentDate < expiryDate) {
            expectedPrice -= totalPrice * (percentage / 100);
          }
        }
        if (pointsRedeemed) {
          expectedPrice -= pointsRedeemed;
        }

        // Verify final price
        if (Math.abs(expectedPrice - finalPrice) > 0.01) {
          throw new Error("Price mismatch");
        }

        // Create order
        const order = await tx.order.create({
          data: {
            totalPrice,
            finalPrice,
            status: "PENDING",
            user: { connect: { id: userId } },
            event: { connect: { id: ticket.eventId! } },
            details: {
              create: {
                quantity,
                tickets: { connect: { id: ticketId } },
                UserCoupon: user.userCouponId
                  ? {
                      connect: { id: user.userCouponId },
                    }
                  : undefined,
              },
            },
          },
          include: {
            details: {
              include: { tickets: true },
            },
          },
        });

        // Update ticket quantity
        await tx.ticket.update({
          where: { id: ticketId },
          data: { quantity: { decrement: quantity } },
        });

        // Update user points if redeemed
        if (pointsRedeemed) {
          await tx.user.update({
            where: { id: userId },
            data: { points: { decrement: pointsRedeemed } },
          });
        }

        return order;
      });

      res.status(201).json({
        message: "Order created successfully",
        orderId: result.id,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Failed to create order",
        orderId: 0,
      });
    }
  }

  async getOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = Number(req.params.id);

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          event: true,
          details: {
            include: { tickets: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  }

  async getUserOrders(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const status = req.query.status as string;

      const where = {
        userId,
        ...(status && { status: status as "PENDING" | "PAID" | "CANCELED" }),
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            event: true,
            details: {
              include: { tickets: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      res.status(200).json({
        orders,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = Number(req.params.id);
      const { status } = req.body;

      if (!["PENDING", "PAID", "CANCELED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          details: {
            include: { tickets: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status },
        });

        if (status === "CANCELED") {
          // Restore tickets
          for (const detail of order.details) {
            await tx.ticket.update({
              where: { id: detail.tickets[0].id },
              data: { quantity: { increment: detail.quantity } },
            });
          }

          // Restore points
          const pointsUsed = order.totalPrice - order.finalPrice;
          if (pointsUsed > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { points: { increment: pointsUsed } },
            });
          }
        }
      });

      res.status(200).json({ message: "Order status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  }
}
