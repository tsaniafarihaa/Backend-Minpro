import prisma from "../prisma";
import { Status } from "../../prisma/generated/client";
import midtransClient from "midtrans-client";

interface OrderTicket {
  id: number;
  quantity: number;
}

interface OrderDetails {
  quantity: number;
  tickets: OrderTicket[];
}

interface CreateOrderParams {
  userId: string;
  eventId: number;
  totalPrice: number;
  finalPrice: number;
  pointsUsed: number;
  userCouponId?: number | null;
  details: OrderDetails;
}

export class PaymentService {
  private snap: midtransClient.Snap;

  constructor() {
    if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
      throw new Error("Midtrans configuration is missing");
    }

    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  async createOrder(data: CreateOrderParams) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate points if used
      if (data.pointsUsed > 0) {
        const user = await tx.user.findUnique({
          where: { id: data.userId }
        });

        if (!user || user.points < data.pointsUsed) {
          throw new Error("Insufficient points");
        }

        if (data.pointsUsed % 10000 !== 0) {
          throw new Error("Points must be in multiples of 10,000");
        }
      }

      // 2. Validate and apply coupon if used
      if (data.userCouponId) {
        const coupon = await tx.userCoupon.findUnique({
          where: { id: data.userCouponId }
        });

        if (!coupon || coupon.isUsed) {
          throw new Error("Coupon is not valid or has been used");
        }

        if (coupon.expiredAt < new Date()) {
          throw new Error("Coupon has expired");
        }
      }

      // 3. Create the order
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          eventId: data.eventId,
          totalPrice: data.totalPrice,
          finalPrice: data.finalPrice,
          status: Status.PENDING,
          userCouponId: data.userCouponId,
          details: {
            create: {
              quantity: data.details.quantity,
              tickets: {
                connect: data.details.tickets.map(ticket => ({
                  id: ticket.id
                }))
              }
            }
          }
        },
        include: {
          user: true,
          event: true,
          details: {
            include: {
              tickets: true
            }
          }
        }
      });

      // 4. Deduct points if used
      if (data.pointsUsed > 0) {
        await tx.user.update({
          where: { id: data.userId },
          data: { points: { decrement: data.pointsUsed } }
        });
      }

      // 5. Mark coupon as used if applied
      if (data.userCouponId) {
        await tx.userCoupon.update({
          where: { id: data.userCouponId },
          data: { isUsed: true }
        });
      }

      // 6. Create Midtrans transaction
      const transaction = await this.snap.createTransaction({
        transaction_details: {
          order_id: `ORDER-${order.id}-${Date.now()}`,
          gross_amount: data.finalPrice,
        },
        customer_details: {
          first_name: order.user.username,
          email: order.user