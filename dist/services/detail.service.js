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
exports.EventDetailService = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class EventDetailService {
    getEventBySlug(slug, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const event = yield prisma_1.default.event.findFirst({
                    where: {
                        slug: slug,
                    },
                    include: {
                        tickets: true,
                        promotor: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                });
                if (!event) {
                    throw new Error("Event not found");
                }
                const hasUserPurchase = yield prisma_1.default.order.findFirst({
                    where: {
                        AND: {
                            user: {
                                id: userId,
                            },
                            event: {
                                id: event.id,
                            },
                        },
                    },
                    include: {
                        event: true,
                    },
                });
                console.log(userId, "userId");
                console.log(hasUserPurchase, "hasUserPurchase");
                let isPurchased = false;
                if (hasUserPurchase) {
                    isPurchased = true;
                }
                else {
                    isPurchased = false;
                }
                return Object.assign(Object.assign({}, event), { isPurchased });
            }
            catch (error) {
                console.error("Error in getEventBySlug:", error);
                throw error;
            }
        });
    }
    getAllEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield prisma_1.default.event.findMany({
                    include: {
                        tickets: true,
                        promotor: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                    orderBy: {
                        date: "asc",
                    },
                });
            }
            catch (error) {
                console.error("Error in getAllEvents:", error);
                throw error;
            }
        });
    }
    getEventById(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const event = yield prisma_1.default.event.findUnique({
                    where: {
                        id: id,
                    },
                    include: {
                        tickets: true,
                        promotor: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                });
                if (!event) {
                    throw new Error("Event not found");
                }
                const hasUserPurchase = yield prisma_1.default.order.findFirst({
                    where: {
                        userId,
                        event: {
                            id: id,
                        },
                    },
                    include: {
                        event: true,
                    },
                });
                console.log(hasUserPurchase, "hasUserPurchase");
                let isPurchased = false;
                if (hasUserPurchase) {
                    isPurchased = true;
                }
                else {
                    isPurchased = false;
                }
                return Object.assign(Object.assign({}, event), { isPurchased });
            }
            catch (error) {
                console.error("Error in getEventById:", error);
                throw error;
            }
        });
    }
    getFilteredEvents() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 9, search, category, location) {
            try {
                const skip = (page - 1) * limit;
                const whereClause = {};
                if (search) {
                    whereClause.OR = [
                        { title: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                    ];
                }
                if (category && category !== "all") {
                    whereClause.category = category;
                }
                if (location && location !== "all") {
                    whereClause.location = location;
                }
                const [events, total] = yield Promise.all([
                    prisma_1.default.event.findMany({
                        where: whereClause,
                        skip,
                        take: limit,
                        include: {
                            tickets: true,
                            promotor: {
                                select: {
                                    name: true,
                                    avatar: true,
                                },
                            },
                        },
                        orderBy: {
                            date: "asc",
                        },
                    }),
                    prisma_1.default.event.count({ where: whereClause }),
                ]);
                return {
                    events,
                    total,
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                };
            }
            catch (error) {
                console.error("Error in getFilteredEvents:", error);
                throw error;
            }
        });
    }
    // Tambahkan method baru
    getTicketById(ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ticket = yield prisma_1.default.ticket.findUnique({
                    where: {
                        id: ticketId,
                    },
                    include: {
                        event: {
                            include: {
                                promotor: {
                                    select: {
                                        name: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                });
                if (!ticket) {
                    throw new Error("Ticket not found");
                }
                return ticket;
            }
            catch (error) {
                console.error("Error in getTicketById:", error);
                throw error;
            }
        });
    }
}
exports.EventDetailService = EventDetailService;
