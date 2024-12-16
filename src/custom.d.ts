import { User } from "@prisma/client";
import { Request } from "express";
import 'express';

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
