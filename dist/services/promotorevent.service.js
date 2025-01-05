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
exports.PromotorEventService = void 0;
// src/services/promotor.events.service.ts
const prisma_1 = __importDefault(require("../prisma"));
class PromotorEventService {
    getPromotorEvents(promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
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
                // Add stats for each event
                return events.map((event) => {
                    const reviews = event.reviews || [];
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
                    return Object.assign(Object.assign({}, event), { stats: {
                            totalReviews: reviews.length,
                            averageRating: Number(averageRating.toFixed(1)),
                        } });
                });
            }
            catch (error) {
                console.error("Error in getPromotorEvents service:", error);
                throw error;
            }
        });
    }
    getUpcomingEvents(promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                return yield prisma_1.default.event.findMany({
                    where: {
                        promotorId,
                        date: {
                            gt: now,
                        },
                    },
                    include: {
                        tickets: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                });
            }
            catch (error) {
                console.error("Error in getUpcomingEvents service:", error);
                throw error;
            }
        });
    }
    getPastEvents(promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const events = yield prisma_1.default.event.findMany({
                    where: {
                        promotorId,
                        date: {
                            lte: now,
                        },
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
                return events.map((event) => {
                    const reviews = event.reviews || [];
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
                    return Object.assign(Object.assign({}, event), { stats: {
                            totalReviews: reviews.length,
                            averageRating: Number(averageRating.toFixed(1)),
                        } });
                });
            }
            catch (error) {
                console.error("Error in getPastEvents service:", error);
                throw error;
            }
        });
    }
}
exports.PromotorEventService = PromotorEventService;
