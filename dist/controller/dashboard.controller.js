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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const client_1 = require("../../prisma/generated/client");
const prisma = new client_1.PrismaClient();
// import { getWeekNumber } from "../utils/getWeekNumber";
const date_fns_1 = require("date-fns");
class DashboardController {
    getEventActive(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const now = new Date();
                const activeEvent = yield prisma.event.count({
                    where: {
                        promotorId: promotorId,
                        date: {
                            gt: now,
                        },
                    },
                });
                res.status(200).json({ activeEvents: activeEvent });
            }
            catch (error) {
                console.error("Error fetching active events:", error);
                res.status(500).json({ error: "Failed to fetch active events" });
            }
        });
    }
    getEventDeactive(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const now = new Date();
                const deactiveEvent = yield prisma.event.count({
                    where: {
                        promotorId: promotorId,
                        date: {
                            lt: now,
                        },
                    },
                });
                res.status(200).json({ deactiveEvents: deactiveEvent });
            }
            catch (error) {
                console.error("Error fetching deactive events:", error);
                res.status(500).json({ error: "Failed to fetch deactive events" });
            }
        });
    }
    getTotalEvent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const totalEvent = yield prisma.event.count({
                    where: {
                        promotorId: promotorId,
                    },
                });
                res.status(200).json({ totalEvents: totalEvent });
            }
            catch (error) {
                console.error("Error fetching total events:", error);
                res.status(500).json({ error: "Failed to fetch total events" });
            }
        });
    }
    getTotalRevenue(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const totalRevenue = yield prisma.order.aggregate({
                    _sum: {
                        finalPrice: true,
                    },
                    where: {
                        status: "PAID", // HITUNG YG PAID SAJA TESTING
                        event: {
                            promotorId: promotorId,
                        },
                    },
                });
                res.status(200).json({ totalRevenue: totalRevenue._sum.finalPrice || 0 });
            }
            catch (error) {
                console.error("Error fetching total revenue:", error);
                res.status(500).json({ error: "Failed to fetch total revenue" });
            }
        });
    }
    getPromotorEvents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const events = yield prisma.event.findMany({
                    where: { promotorId: promotorId },
                    include: {
                        orders: true, // Include orders to count those with "PAID" status
                    },
                    orderBy: {
                        date: "desc", // Orders the events by date from most recent to oldest
                    },
                });
                const formattedEvents = events.map((event) => {
                    const ticketsSold = event.orders.filter((order) => order.status === "PAID").length;
                    const totalRevenue = event.orders
                        .filter((order) => order.status === "PAID")
                        .reduce((sum, order) => sum + (order.finalPrice || 0), 0);
                    const profit = totalRevenue / 100; // Calculates profit as a percentage of total revenue gagal
                    return {
                        id: event.id,
                        title: event.title,
                        category: event.category,
                        description: event.description,
                        date: event.date,
                        location: event.venue,
                        ticketsSold, //  count of PAID orders
                        revenue: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
                        profit: `Rp ${profit.toLocaleString("id-ID")}`,
                        profitPercentage: `${profit}%`,
                        thumbnail: event.thumbnail,
                    };
                });
                res.status(200).json({ events: formattedEvents });
            }
            catch (error) {
                console.error("Error fetching promotor events:", error);
                res.status(500).json({ error: "Failed to fetch promotor events" });
            }
        });
    }
    getTotalPaidTransactions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                // Count all orders with "PAID" status
                const totalPaidTransactions = yield prisma.order.count({
                    where: {
                        status: "PAID",
                        event: {
                            promotorId: promotorId,
                        },
                    },
                });
                res.status(200).json({ totalPaidTransactions });
            }
            catch (error) {
                console.error("Error fetching total paid transactions:", error);
                res.status(500).json({ error: "Failed to fetch total paid transactions" });
            }
        });
    }
    getRevenueGroupedByPeriod(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id; // Ensure promotorId is extracted correctly
                if (!promotorId) {
                    res.status(400).json({ error: "Invalid promotor ID" });
                    return;
                }
                const period = req.query.period;
                if (!["day", "week", "month", "year"].includes(period)) {
                    res.status(400).json({
                        error: "Invalid period. Use 'day', 'week', 'month', or 'year'.",
                    });
                    return;
                }
                // Fetch orders
                const orders = yield prisma.order.findMany({
                    where: {
                        status: "PAID",
                        event: {
                            promotorId: promotorId,
                        },
                    },
                    select: {
                        createdAt: true,
                        finalPrice: true,
                    },
                });
                if (!orders.length) {
                    res.status(200).json({ message: "No orders found", groupedRevenue: [] });
                    return;
                }
                // Aggregate revenue
                const groupedRevenue = orders.reduce((acc, order) => {
                    var _a;
                    const date = new Date(order.createdAt); // Parse createdAt
                    let periodLabel;
                    if (period === "day") {
                        periodLabel = date.toISOString().split("T")[0]; // YYYY-MM-DD
                    }
                    else if (period === "week") {
                        const weekNumber = (0, date_fns_1.getISOWeek)(date);
                        const year = date.getFullYear();
                        periodLabel = `Week ${weekNumber}, ${year}`;
                    }
                    else if (period === "month") {
                        const month = date.getMonth() + 1;
                        const year = date.getFullYear();
                        periodLabel = `Month ${month}, ${year}`;
                    }
                    else if (period === "year") {
                        const year = date.getFullYear();
                        periodLabel = `Year ${year}`;
                    }
                    else {
                        throw new Error("Invalid period specified.");
                    }
                    // Sum finalPrice for each period
                    if (!acc[periodLabel]) {
                        acc[periodLabel] = 0;
                    }
                    acc[periodLabel] += (_a = order.finalPrice) !== null && _a !== void 0 ? _a : 0;
                    return acc;
                }, {});
                // Format the response
                const formattedRevenue = Object.entries(groupedRevenue).map(([period, totalRevenue]) => ({
                    period,
                    totalRevenue,
                }));
                res.status(200).json({ groupedRevenue: formattedRevenue });
            }
            catch (error) {
                console.error("Error fetching revenue grouped by period:", error);
                res.status(500).json({ error: "Failed to fetch grouped revenue" });
            }
        });
    }
}
exports.DashboardController = DashboardController;
// async getRevenueGroupedByPeriod(req: Request, res: Response): Promise<void> {
//   try {
//     const promotorId = req.promotor?.id;
//     if (!promotorId) {
//       res.status(400).json({ error: "Invalid promotor ID" });
//       return;
//     }
//     const period = req.query.period as string;
//     if (!["week", "month", "year"].includes(period)) {
//       res.status(400).json({ error: "Invalid period. Use 'week', 'month', or 'year'" });
//       return;
//     }
//     const orders = await prisma.order.findMany({
//       where: {
//         status: "PAID",
//         event: {
//           promotorId: promotorId,
//         },
//       },
//       select: {
//         createdAt: true,
//         finalPrice: true,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });
//     const groupedRevenue = orders.reduce((acc, order) => {
//       const date = new Date(order.createdAt);
//       let periodLabel: string;
//       if (period === "week") {
//         periodLabel = `Week ${getWeekNumber(date)}`;
//       } else if (period === "month") {
//         periodLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
//       } else {
//         periodLabel = `${date.getFullYear()}`;
//       }
//       if (!acc[periodLabel]) {
//         acc[periodLabel] = 0;
//       }
//       acc[periodLabel] += order.finalPrice ?? 0;
//       return acc;
//     }, {} as Record<string, number>);
//     const formattedRevenue = Object.entries(groupedRevenue).map(([period, totalRevenue]) => ({
//       period,
//       totalRevenue,
//     }));
//     res.status(200).json({ groupedRevenue: formattedRevenue });
//   } catch (error) {
//     console.error("Error fetching revenue grouped by period:", error);
//     res.status(500).json({ error: "Failed to fetch grouped revenue" });
//   }
// }
//   async getTotalTransaction(req: Request, res: Response) {
//     try {
//       const userId = req.user?.user_id;
//       if (!userId) {
//         res.status(400).send({ error: "Invalid user ID" });
//       }
//       const totalTransaction = await prisma.transaction.aggregate({
//         _sum: {
//           finalPrice: true,
//         },
//         where: {
//           user_id: userId,
//           paymentStatus: "COMPLETED",
//         },
//       });
//       res.status(200).send({
//         totalTransaction: totalTransaction._sum.finalPrice,
//       });
//     } catch (error) {
//       console.error("Error fetching dashboard stats: ", error);
//       res.status(500).send({ message: "Internal Server Error" });
//     }
//   }
//   async getIncomePerday(req: Request, res: Response) {
//     try {
//       const userId = req.user?.user_id;
//       if (!userId) {
//         res.status(401).send({ message: "Unauthorized: user not logged in" });
//       }
//       // Fetch all transactions with completed payment status
//       const transactions = await prisma.transaction.findMany({
//         where: {
//           user_id: userId,
//           paymentStatus: "COMPLETED",
//         },
//         select: {
//           createdAt: true,
//           finalPrice: true,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//       });
//       // Group by date (manual aggregation)
//       const incomePerDay = transactions.reduce((acc, transaction) => {
//         const date = transaction.createdAt.toISOString().split("T")[0]; // Extract date part only
//         if (!acc[date]) {
//           acc[date] = 0;
//         }
//         acc[date] += transaction.finalPrice || 0; // Sum finalPrice
//         return acc;
//       }, {} as Record<string, number>);
//       // Format the result
//       const formattedData = Object.entries(incomePerDay).map(
//         ([date, totalIncome]) => ({
//           date,
//           totalIncome,
//         })
//       );
//       res.status(200).send({ incomePerDay: formattedData });
//     } catch (error) {
//       console.error("Error fetching income per day: ", error);
//       res.status(500).send({ message: "Internal Server Error" });
//     }
//   }
//   async getIncomePerMonth(req: Request, res: Response) {
//     try {
//       const userId = req.user?.user_id;
//       if (!userId) {
//         res.status(401).send({ message: "Unauthorized: user not logged in" });
//       }
//       const transactions = await prisma.transaction.findMany({
//         where: {
//           user_id: userId,
//           paymentStatus: "COMPLETED",
//         },
//         select: {
//           createdAt: true,
//           finalPrice: true,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//       });
//       const incomePerMonth = transactions.reduce((acc, transaction) => {
//         const month = transaction.createdAt.toISOString().slice(0, 7); // Format: YYYY-MM
//         if (!acc[month]) {
//           acc[month] = 0;
//         }
//         acc[month] += transaction.finalPrice || 0; // Sum finalPrice
//         return acc;
//       }, {} as Record<string, number>);
//       const formattedIncome = Object.entries(incomePerMonth).map(
//         ([month, totalIncome]) => ({
//           month,
//           totalIncome,
//         })
//       );
//       res.status(200).send({ incomePerMonth: formattedIncome });
//     } catch (error) {
//       console.error("Error fetching income per month: ", error);
//       res.status(500).send({ message: "Internal Server Error" });
//     }
//   }
//   // Get income per year
//   async getIncomePerYear(req: Request, res: Response) {
//     try {
//       const userId = req.user?.user_id;
//       if (!userId) {
//         res.status(401).send({ message: "Unauthorized: user not logged in" });
//       }
//       const transactions = await prisma.transaction.findMany({
//         where: {
//           user_id: userId,
//           paymentStatus: "COMPLETED",
//         },
//         select: {
//           createdAt: true,
//           finalPrice: true,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//       });
//       const incomePerYear = transactions.reduce((acc, transaction) => {
//         const year = transaction.createdAt.toISOString().slice(0, 4); // Format: YYYY
//         if (!acc[year]) {
//           acc[year] = 0;
//         }
//         acc[year] += transaction.finalPrice || 0; // Sum finalPrice
//         return acc;
//       }, {} as Record<string, number>);
//       const formattedIncome = Object.entries(incomePerYear).map(
//         ([year, totalIncome]) => ({
//           year,
//           totalIncome,
//         })
//       );
//       res.status(200).send({ incomePerYear: formattedIncome });
//     } catch (error) {
//       console.error("Error fetching income per year: ", error);
//       res.status(500).send({ message: "Internal Server Error" });
//     }
//   }
