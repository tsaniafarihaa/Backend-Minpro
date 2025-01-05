"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const midtrans_1 = require("../services/midtrans");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const handlebars_1 = __importDefault(require("handlebars"));
const mailer_1 = require("../services/mailer");
const date_fns_1 = require("date-fns");
class PaymentController {
    createPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { orderId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!orderId || !userId) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                const order = yield prisma_1.default.order.findFirst({
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
                // Check coupon usage if the order uses a coupon
                const orderDetail = order.details[0];
                if (orderDetail === null || orderDetail === void 0 ? void 0 : orderDetail.userCouponId) {
                    // Verify user has valid coupon
                    if (!((_b = order.user.usercoupon) === null || _b === void 0 ? void 0 : _b.isRedeem) || !order.user.percentage) {
                        return res.status(400).json({ message: "Invalid coupon" });
                    }
                    // Check if user has already used a coupon for this event
                    const existingCouponUse = yield prisma_1.default.orderDetail.findFirst({
                        where: {
                            order: {
                                eventId: order.event.id,
                                userId: userId,
                                NOT: {
                                    status: "CANCELED",
                                },
                            },
                            userCouponId: {
                                not: null,
                            },
                        },
                    });
                    if (existingCouponUse) {
                        return res.status(400).json({
                            message: "You have already used a coupon for this event",
                        });
                    }
                    // Check coupon limit for event
                    const couponUseCount = yield prisma_1.default.orderDetail.count({
                        where: {
                            order: {
                                eventId: order.event.id,
                                NOT: {
                                    status: "CANCELED",
                                },
                            },
                            userCouponId: {
                                not: null,
                            },
                        },
                    });
                    if (couponUseCount >= 2) {
                        return res.status(400).json({
                            message: "Coupon limit reached for this event",
                        });
                    }
                }
                const ticket = orderDetail === null || orderDetail === void 0 ? void 0 : orderDetail.tickets[0];
                if (!orderDetail || !ticket) {
                    return res.status(404).json({ message: "Ticket details not found" });
                }
                let eachPrice = order.finalPrice / orderDetail.quantity;
                const transaction = yield midtrans_1.midtransService.createTransaction({
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
                        finish: `${process.env.NEXT_PUBLIC_BASE_URL_FE}/payment/success?order_id=ORDER-${order.id}`,
                        error: `${process.env.NEXT_PUBLIC_BASE_URL_FE}/payment/failed?order_id=ORDER-${order.id}`,
                    },
                });
                yield prisma_1.default.order.update({
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
            }
            catch (error) {
                console.error("Payment creation error:", error);
                return res.status(500).json({
                    message: "Failed to create payment",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    handleNotification(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const notification = yield midtrans_1.midtransService.handleNotification(req.body);
                const orderId = notification.order_id.replace("ORDER-", "");
                const transactionStatus = notification.transaction_status;
                let status = "PENDING";
                if (transactionStatus === "settlement" ||
                    transactionStatus === "capture" ||
                    transactionStatus === "success") {
                    status = "PAID";
                }
                else if (transactionStatus === "deny" ||
                    transactionStatus === "cancel" ||
                    transactionStatus === "expire" ||
                    transactionStatus === "failure") {
                    status = "CANCELED";
                }
                const order = yield prisma_1.default.order.findUnique({
                    where: { id: Number(orderId) },
                    include: {
                        details: true,
                    },
                });
                if (!order) {
                    throw new Error("Order not found");
                }
                // Update order status
                yield prisma_1.default.order.update({
                    where: { id: Number(orderId) },
                    data: { status },
                });
                // If order is canceled and used a coupon, revert coupon usage
                if (status === "CANCELED" && ((_a = order.details[0]) === null || _a === void 0 ? void 0 : _a.userCouponId)) {
                    yield prisma_1.default.userCoupon.update({
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
            }
            catch (error) {
                console.error("Notification error:", error);
                return res.status(500).json({ message: "Failed to handle notification" });
            }
        });
    }
    getCouponCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const eventId = parseInt(req.params.eventId);
                if (!eventId) {
                    return res.status(400).json({ message: "Missing event ID" });
                }
                const count = yield prisma_1.default.orderDetail.count({
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
            }
            catch (error) {
                console.error("Get coupon count error:", error);
                return res.status(500).json({ message: "Failed to get coupon count" });
            }
        });
    }
    checkUserCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(400).json({ message: "User not found" });
                }
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: userId },
                    include: { usercoupon: true },
                });
                const canUseCoupon = Boolean(((_b = user === null || user === void 0 ? void 0 : user.usercoupon) === null || _b === void 0 ? void 0 : _b.isRedeem) && (user === null || user === void 0 ? void 0 : user.percentage));
                return res.status(200).json({ canUseCoupon });
            }
            catch (error) {
                console.error("Check user coupon error:", error);
                return res.status(500).json({ message: "Failed to check user coupon" });
            }
        });
    }
    checkCouponAvailability(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const eventId = parseInt(req.params.eventId);
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!eventId || !userId) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                // Check if user has already used a coupon for this event
                const existingCouponUse = yield prisma_1.default.orderDetail.findFirst({
                    where: {
                        order: {
                            eventId: eventId,
                            userId: userId,
                            NOT: {
                                status: "CANCELED",
                            },
                        },
                        userCouponId: {
                            not: null,
                        },
                    },
                });
                // Count total coupon usage for this event
                const couponUseCount = yield prisma_1.default.orderDetail.count({
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
                return res.status(200).json({
                    canUseCoupon: !existingCouponUse && couponUseCount < 10,
                    couponUsageCount: couponUseCount,
                    remainingCoupons: Math.max(0, 10 - couponUseCount),
                });
            }
            catch (error) {
                console.error("Coupon check error:", error);
                return res.status(500).json({
                    message: "Failed to check coupon availability",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    updateOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId, status } = req.body;
                if (!orderId || !status) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                const order = yield prisma_1.default.order.findUnique({
                    where: { id: Number(orderId) },
                    include: {
                        details: true,
                    },
                });
                if (!order) {
                    return res.status(404).json({ message: "Order not found" });
                }
                const updatedOrder = yield prisma_1.default.order.update({
                    where: { id: Number(orderId) },
                    data: {
                        status: status,
                    },
                });
                // If order is canceled and used a coupon, revert coupon usage
                if (status === "CANCELED" && ((_a = order.details[0]) === null || _a === void 0 ? void 0 : _a.userCouponId)) {
                    yield prisma_1.default.userCoupon.update({
                        where: { id: order.details[0].userCouponId },
                        data: { isRedeem: true },
                    });
                }
                return res.status(200).json({
                    message: "Order status updated",
                    order: updatedOrder,
                });
            }
            catch (error) {
                console.error("Update order status error:", error);
                return res.status(500).json({ message: "Failed to update order status" });
            }
        });
    }
    sendSuccessEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const { orderId } = req.params;
                if (!orderId) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userData = yield prisma_1.default.user.findUnique({
                    where: {
                        id: userId,
                    },
                });
                if (!userData || !userData.email) {
                    return res.status(400).json({ message: "User data not found" });
                }
                const orderData = yield prisma_1.default.order.findFirst({
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
                const templatePath = path_1.default.join(__dirname, "../templates", "orderSuccess.hbs");
                const templateSource = fs_1.default.readFileSync(templatePath, "utf-8");
                const compiledTemplate = handlebars_1.default.compile(templateSource);
                const formattedDate = (0, date_fns_1.format)(new Date((_b = orderData.event.date) !== null && _b !== void 0 ? _b : ""), "dd MMMM yyyy HH:mm a");
                const html = compiledTemplate({
                    username: userData.username,
                    concertName: orderData.event.title,
                    categoryName: (_d = (_c = orderData.details[0]) === null || _c === void 0 ? void 0 : _c.tickets[0]) === null || _d === void 0 ? void 0 : _d.category,
                    concertDate: formattedDate,
                    concertLocation: orderData.event.location,
                    discountApplied: ((_e = orderData.details[0]) === null || _e === void 0 ? void 0 : _e.UserCoupon) ? "Yes" : "No",
                    finalPrice: orderData.finalPrice.toLocaleString("id-ID", {
                        style: "currency",
                        currency: "IDR",
                    }),
                });
                yield mailer_1.transporter.sendMail({
                    from: process.env.MAIL_USER,
                    to: userData.email,
                    subject: "Your TIKO Order Confirmation",
                    html,
                });
                return res.status(200).json({
                    message: "Success",
                    detail: "Order confirmation email sent successfully",
                });
            }
            catch (error) {
                console.error("Send success email error:", error);
                return res.status(500).json({
                    message: "Failed to send email",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    getOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!orderId || !userId) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                const order = yield prisma_1.default.order.findFirst({
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
                const midtransStatus = yield midtrans_1.midtransService.getStatus(`ORDER-${orderId}`);
                return res.status(200).json({
                    order,
                    paymentStatus: midtransStatus,
                });
            }
            catch (error) {
                console.error("Get order status error:", error);
                return res.status(500).json({
                    message: "Failed to get payment status",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
}
exports.PaymentController = PaymentController;
