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
exports.OrderController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class OrderController {
    createOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { eventId, ticketId, quantity, totalPrice, finalPrice, usePoints, useCoupon, status, // Add status to destructured parameters
                 } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!eventId || !ticketId || !quantity || userId === undefined) {
                    return res.status(400).json({ message: "Missing required fields" });
                }
                // Check ticket availability
                const ticket = yield prisma_1.default.ticket.findUnique({
                    where: { id: ticketId },
                    include: {
                        event: true, // Include event to check if it's free
                    },
                });
                if (!ticket || ticket.quantity < quantity) {
                    return res
                        .status(400)
                        .json({ message: "Insufficient ticket quantity" });
                }
                const isFreeTicket = ticket.price === 0;
                // Use provided status or determine based on whether it's a free ticket
                const orderStatus = isFreeTicket ? "PAID" : status || "PENDING";
                // Start transaction
                const order = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Update ticket quantity
                    yield tx.ticket.update({
                        where: { id: ticketId },
                        data: { quantity: { decrement: quantity } },
                    });
                    // Handle points redemption if not a free ticket
                    if (!isFreeTicket && usePoints) {
                        yield tx.user.update({
                            where: { id: userId },
                            data: { points: { decrement: 10000 } },
                        });
                    }
                    let userCouponId = null;
                    if (!isFreeTicket && useCoupon) {
                        // Check if user already used coupon for this event
                        const existingCouponUse = yield tx.order.findFirst({
                            where: {
                                userId,
                                eventId,
                                details: {
                                    some: {
                                        userCouponId: {
                                            not: null,
                                        },
                                    },
                                },
                                NOT: {
                                    status: "CANCELED",
                                },
                            },
                        });
                        if (existingCouponUse) {
                            throw new Error("You have already used a coupon for this event");
                        }
                        // Check coupon limit for event
                        const couponUseCount = yield tx.order.count({
                            where: {
                                eventId,
                                details: {
                                    some: {
                                        userCouponId: {
                                            not: null,
                                        },
                                    },
                                },
                                NOT: {
                                    status: "CANCELED",
                                },
                            },
                        });
                        if (couponUseCount >= 10) {
                            throw new Error("Coupon limit reached for this event");
                        }
                        // If validations pass, get and use the coupon
                        const user = yield tx.user.findUnique({
                            where: { id: userId },
                            include: { usercoupon: true },
                        });
                        if (!(user === null || user === void 0 ? void 0 : user.usercoupon)) {
                            throw new Error("No coupon available");
                        }
                        if (user.usercoupon.isRedeem) {
                            throw new Error("Coupon already used");
                        }
                        userCouponId = user.usercoupon.id;
                        yield tx.userCoupon.update({
                            where: { id: userCouponId },
                            data: { isRedeem: true },
                        });
                    }
                    // Create order with proper status
                    return yield tx.order.create({
                        data: {
                            eventId,
                            userId,
                            totalPrice,
                            finalPrice,
                            status: orderStatus, // Use the determined status
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
                }), { timeout: 6000 });
                res.status(201).json({
                    message: "Order created successfully",
                    data: order,
                });
            }
            catch (error) {
                console.error("Create order error:", error);
                res.status(500).json({
                    message: "Failed to create order",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    getCouponCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const eventId = Number(req.params.eventId);
                const count = yield prisma_1.default.order.count({
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
            }
            catch (error) {
                res.status(500).json({ message: "Failed to get coupon count" });
            }
        });
    }
    checkUserCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const findHistoryUserCoupon = yield prisma_1.default.order.findFirst({
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
                console.log(findHistoryUserCoupon, "findHistoryUserCoupon");
                if (!findHistoryUserCoupon) {
                    return res.status(200).json({ canUseCoupon: true });
                }
                else {
                    return res.status(200).json({ canUseCoupon: false });
                }
            }
            catch (error) {
                res.status(500).json({ message: "Failed to get coupon count" });
            }
        });
    }
    getOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { id } = req.params;
                let orderId = Number(id);
                const order = yield prisma_1.default.order.findFirst({
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
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch order" });
            }
        });
    }
    checkUserAllowedBuyEvent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const eventId = Number(req.params.eventId);
                const order = yield prisma_1.default.order.findFirst({
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
                    return res.status(400).json({ message: "User has been buy event" });
                }
                res.status(200).json(order);
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch order" });
            }
        });
    }
    getUserOrders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const page = Number(req.query.page || 1);
                const limit = Number(req.query.limit || 10);
                const status = req.query.status;
                const where = Object.assign({ userId }, (status && { status: status }));
                const [orders, total] = yield Promise.all([
                    prisma_1.default.order.findMany({
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
                    prisma_1.default.order.count({ where }),
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
            }
            catch (error) {
                res.status(500).json({ message: "Failed to fetch orders" });
            }
        });
    }
    updateOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const orderId = Number(req.params.id);
                const { status } = req.body;
                if (!["PENDING", "PAID", "CANCELED"].includes(status)) {
                    return res.status(400).json({ message: "Invalid status" });
                }
                const order = yield prisma_1.default.order.findFirst({
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
                yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    yield tx.order.update({
                        where: { id: orderId },
                        data: { status },
                    });
                    if (status === "CANCELED") {
                        // Restore tickets
                        for (const detail of order.details) {
                            yield tx.ticket.update({
                                where: { id: detail.tickets[0].id },
                                data: { quantity: { increment: detail.quantity } },
                            });
                        }
                        // Restore points
                        const pointsUsed = order.totalPrice - order.finalPrice;
                        if (pointsUsed > 0) {
                            yield tx.user.update({
                                where: { id: userId },
                                data: { points: { increment: pointsUsed } },
                            });
                        }
                    }
                }));
                res.status(200).json({ message: "Order status updated successfully" });
            }
            catch (error) {
                res.status(500).json({ message: "Failed to update order status" });
            }
        });
    }
}
exports.OrderController = OrderController;
