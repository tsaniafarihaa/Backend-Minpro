import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { PromotorPayload } from "../custom";

export const verifyTokenPromotor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      const error = new Error("Unauthorized: No token provided");
      res.status(401).json({ message: error.message });
      return; 
    }


    const verifiedPromotor = verify(token, process.env.JWT_KEY!);
    req.promotor = verifiedPromotor as PromotorPayload;

    next();
  } catch (err) {
    console.error("Token verification error:", err);

    next(err);
  }
};
