import { Request, Response } from "express";
import prisma from "../prisma";
import { OrderPayload } from "../custom";

export class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      const {
        eventId,
        ticketId,
        quantity,
        totalPrice,
        finalPrice,
        usePoints,
        useCoupon,
        status,
      } = req.body;
      const userId = req.user?.id;

      if (!eventId || !ticketId || !quantity || userId === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check ticket availability
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          event: true,
        },
      });

      if (!ticket || ticket.quantity < quantity) {
        return res
          .status(400)
          .json({ message: "Insufficient ticket quantity" });
      }

      const isFreeTicket = ticket.price === 0;
      const orderStatus = isFreeTicket ? "PAID" : status || "PENDING";

      // Start transaction
      const order = await prisma.$transaction(async (tx) => {
        // Update ticket quantity
        await tx.ticket.update({
          where: { id: ticketId },
          data: { quantity: { decrement: quantity } },
        });

        let userCouponId = null;

        // Handle points redemption
        if (!isFreeTicket && usePoints) {
          const user = await tx.user.findUnique({
            where: { id: userId },
          });

          if (!user || user.points < 10000) {
            throw new Error("Insufficient points");
          }

          await tx.user.update({
            where: { id: userId },
            data: { points: { decrement: 10000 } },
          });
        }

        // Handle coupon
        if (!isFreeTicket && useCoupon) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            include: { usercoupon: true },
          });

          if (!user?.usercoupon) {
            throw new Error("No coupon available");
          }

          if (user.usercoupon.isRedeem === true) {
            throw new Error("Coupon has already been used");
          }

          const couponUseCount = await tx.orderDetail.count({
            where: {
              order: {
                eventId,
                NOT: { status: "CANCELED" },
              },
              userCouponId: { not: null },
            },
          });

          if (couponUseCount >= 10) {
            throw new Error("Coupon limit reached for this event");
          }

          userCouponId = user.usercoupon.id;

          await tx.userCoupon.update({
            where: { id: userCouponId },
            data: { isRedeem: true },
          });
        }

        // Create order
        return await tx.order.create({
          data: {
            userId,
            eventId,
            status: orderStatus,
            totalPrice,
            finalPrice,
            details: {
              create: {
                quantity,
                userCouponId,
                tickets: {
                  connect: { id: ticketId },
                },
              },
            },
          },
          include: {
            details: {
              include: {
                tickets: true,
              },
            },
          },
        });
      });

      return res.status(201).json({
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("Create order error:", error);
      return res.status(500).json({
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Rest of the methods remain the same...
  async getCouponCount(req: Request, res: Response) {
    try {
      const eventId = Number(req.params.eventId);

      const count = await prisma.order.count({
        where: {
          eventId,
          details: {
            some: {
              UserCoupon: { isNot: null },
            },
          },
        },
      });

      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get coupon count" });
    }
  }

  async checkUserCoupon(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const findHistoryUserCoupon = await prisma.order.findFirst({
        where: {
          userId,
          details: {
            some: {
              userCouponId: {
                gt: 0,
              },
            },
          },
        },
      });

      if (!findHistoryUserCoupon) {
        return res.status(200).json({ canUseCoupon: true });
      } else {
        return res.status(200).json({ canUseCoupon: false });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to check coupon status" });
    }
  }

  async getOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      let orderId = Number(id);
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
          for (const detail of order.details) {
            await tx.ticket.update({
              where: { id: detail.tickets[0].id },
              data: { quantity: { increment: detail.quantity } },
            });
          }

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

  async checkUserAllowedBuyEvent(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const eventId = Number(req.params.eventId);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          event: {
            id: eventId,
          },
        },
        include: {
          event: true,
          details: {
            include: { tickets: true },
          },
        },
      });

      if (order) {
        return res.status(400).json({
          message: "User has already purchased tickets for this event",
        });
      }

      res.status(200).json(null);
    } catch (error) {
      res.status(500).json({ message: "Failed to check user purchase status" });
    }
  }
}
