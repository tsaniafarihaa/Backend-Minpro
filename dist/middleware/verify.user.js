"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenUser = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const verifyTokenUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
            ? authHeader.split(" ")[1]
            : null;
        if (!token) {
            res.status(401).json({ message: "Unauthorized: No token provided" });
            return;
        }
        const verifiedUser = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
        req.user = verifiedUser;
        next();
    }
    catch (err) {
        console.error("Token verification error:", err);
        res
            .status(401)
            .json({ message: "Unauthorized: Invalid token", error: err });
    }
};
exports.verifyTokenUser = verifyTokenUser;
