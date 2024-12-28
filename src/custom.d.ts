import { User } from "../../prisma/generated/client";
import { Request } from "express";
import "express";

export type UserPayload = {
  id: string;
};

export type PromotorPayload = {
  id: string;
};

declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
      promotor?: PromotorPayload;
    }
  }
}

export interface CreateEventRequest {
  title: string;
  category: string;
  location: string;
  venue: string;
  description: string;
  date: string;
  time: string;
  tickets: {
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }[];
}

export interface OrderPayload {
  ticketId: number;
  quantity: number;
  totalPrice: number;
  finalPrice: number;
  pointsRedeemed?: number;
  percentage?: number;
}

export interface OrderResponse {
  message: string;
  orderId: number;
}

export interface OrderRequest {
  ticketId: number;
  quantity: number;
  totalPrice: number;
  finalPrice: number;
  pointsRedeemed?: number;
  percentage?: number;
}
