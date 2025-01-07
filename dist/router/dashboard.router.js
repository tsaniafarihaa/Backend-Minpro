"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRouter = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("../controller/dashboard.controller");
const verify_promotor_1 = require("../middleware/verify.promotor");
class DashboardRouter {
    constructor() {
        this.dashboardController = new dashboard_controller_1.DashboardController();
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Routing untuk isi si dasboard
        this.router.get("/getAllEvent", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getTotalEvent);
        this.router.get("/getActiveEvent", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getEventActive);
        this.router.get("/getDeactiveEvent", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getEventDeactive);
        this.router.get("/getTotalRevenue", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getTotalRevenue);
        this.router.get("/getalltransaction", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getTotalPaidTransactions);
        //Routing untuk mendapatkan si event beserta pendapatan nya berdasarkan promotor yg telah login
        this.router.get("/promotor/detailEventDashboard", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getPromotorEvents);
        this.router.get("/getgrouprevenue", verify_promotor_1.verifyTokenPromotor, this.dashboardController.getRevenueGroupedByPeriod);
        //Routing untuk mendapatkan si event beserta pendapatan nya berdasarkan ID
        // this.router.get(
        //   "/getEventDasboardbyID/:eventId",
        //   verifyTokenPromotor,
        //   this.dashboardController.getEventDetails
        // );
    }
    getRouter() {
        return this.router;
    }
}
exports.DashboardRouter = DashboardRouter;
