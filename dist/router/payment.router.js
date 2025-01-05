"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/payment.router.ts
const express_1 = require("express");
const payment_controller_1 = require("../controller/payment.controller");
const verify_1 = require("../middleware/verify");
const router = (0, express_1.Router)();
const paymentController = new payment_controller_1.PaymentController();
// Create payment route
router.post("/create", verify_1.verifyToken, (req, res) => {
    paymentController.createPayment(req, res);
});
// Midtrans notification webhook
router.post("/notification", (req, res) => {
    console.log("Received notification:", req.body);
    paymentController.handleNotification(req, res);
});
// Check coupon availability for an event
router.get("/check-coupon/:eventId", verify_1.verifyToken, (req, res) => {
    paymentController.checkCouponAvailability(req, res);
});
// Get total coupon usage count for an event
router.get("/coupon-count/:eventId", verify_1.verifyToken, (req, res) => {
    paymentController.getCouponCount(req, res);
});
// Check if user has valid coupon
router.get("/check-user-coupon", verify_1.verifyToken, (req, res) => {
    paymentController.checkUserCoupon(req, res);
});
// Update order status
router.post("/update-status", verify_1.verifyToken, (req, res) => {
    paymentController.updateOrderStatus(req, res);
});
// Send success email after payment
router.post("/success-email-order/:orderId", verify_1.verifyToken, (req, res) => {
    paymentController.sendSuccessEmail(req, res);
});
// Get order status and payment details
router.get("/order/:orderId", verify_1.verifyToken, (req, res) => {
    paymentController.getOrderStatus(req, res);
});
exports.default = router;
