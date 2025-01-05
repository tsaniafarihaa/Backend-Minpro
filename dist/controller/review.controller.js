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
exports.ReviewController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class ReviewController {
    // Modified createReview function in review.controller.ts
    createReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { eventId, rating, comment } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: "Unauthorized" });
                    return;
                }
                // Check for existing review
                const existingReview = yield prisma_1.default.reviews.findFirst({
                    where: {
                        userId,
                        eventId,
                    },
                });
                if (existingReview) {
                    res.status(400).json({
                        message: "You have already reviewed this event",
                    });
                    return;
                }
                const event = yield prisma_1.default.event.findUnique({
                    where: { id: eventId },
                });
                if (!event) {
                    res.status(404).json({ message: "Event not found" });
                    return;
                }
                const eventDate = new Date(event.date);
                const now = new Date();
                if (eventDate > now) {
                    res.status(400).json({
                        message: "Cannot review an event that hasn't finished yet",
                    });
                    return;
                }
                const userOrder = yield prisma_1.default.order.findFirst({
                    where: {
                        userId,
                        eventId,
                        status: "PAID",
                    },
                });
                if (!userOrder) {
                    res.status(400).json({
                        message: "You can only review events you have attended",
                    });
                    return;
                }
                const review = yield prisma_1.default.reviews.create({
                    data: {
                        rating,
                        comment,
                        user: {
                            connect: { id: userId },
                        },
                        event: {
                            connect: { id: eventId },
                        },
                    },
                    include: {
                        user: {
                            select: {
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                });
                res.status(201).json({
                    message: "Review created successfully",
                    review,
                });
            }
            catch (error) {
                console.error("Create review error:", error);
                res.status(500).json({
                    message: "Failed to create review",
                });
            }
        });
    }
    getEventReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { eventId } = req.params;
                if (!eventId) {
                    res.status(400).json({ message: "Event ID is required" });
                    return;
                }
                const reviews = yield prisma_1.default.reviews.findMany({
                    where: {
                        eventId: Number(eventId),
                    },
                    include: {
                        user: {
                            select: {
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                });
                res.status(200).json(reviews);
            }
            catch (error) {
                console.error("Get reviews error:", error);
                res.status(500).json({
                    message: "Failed to fetch reviews",
                });
            }
        });
    }
    getPromotorEvents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(401).json({ message: "Unauthorized" });
                    return;
                }
                const events = yield prisma_1.default.event.findMany({
                    where: {
                        promotorId,
                    },
                    include: {
                        reviews: {
                            include: {
                                user: {
                                    select: {
                                        username: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                        tickets: true,
                    },
                    orderBy: {
                        date: "desc",
                    },
                });
                const eventsWithStats = events.map((event) => {
                    const reviews = event.reviews || [];
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
                    return Object.assign(Object.assign({}, event), { stats: {
                            totalReviews: reviews.length,
                            averageRating: Number(averageRating.toFixed(1)),
                        } });
                });
                res.status(200).json(eventsWithStats);
            }
            catch (error) {
                console.error("Get promotor events error:", error);
                res.status(500).json({
                    message: "Failed to fetch events",
                });
            }
        });
    }
}
exports.ReviewController = ReviewController;
