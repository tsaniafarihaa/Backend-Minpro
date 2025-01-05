"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenPromotor = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const verifyTokenPromotor = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) ? authHeader.split(" ")[1] : null;
        if (!token) {
            const error = new Error("Unauthorized: No token provided");
            res.status(401).json({ message: error.message });
            return;
        }
        const verifiedPromotor = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
        req.promotor = verifiedPromotor;
        if (!token) {
            res.status(401).json({ message: "Invalid token format" });
            return;
        }
        try {
            const verifiedPromotor = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
            req.promotor = verifiedPromotor;
            next();
        }
        catch (verifyError) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
    }
    catch (err) {
        console.error("Token verification error:", err);
        next(err);
    }
};
exports.verifyTokenPromotor = verifyTokenPromotor;
