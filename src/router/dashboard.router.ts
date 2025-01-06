import { Router } from "express";
import { DashboardController } from "../controller/dashboard.controller";
import { verifyTokenPromotor } from "../middleware/verify.promotor";

export class DashboardRouter {
  private dashboardController: DashboardController;
  private router: Router;

  constructor() {
    this.dashboardController = new DashboardController();
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Routing untuk isi si dasboard
    this.router.get(
      "/getAllEvent",
      verifyTokenPromotor,
      this.dashboardController.getTotalEvent
    );
    this.router.get(
      "/getActiveEvent",
      verifyTokenPromotor,
      this.dashboardController.getEventActive
    );
    this.router.get(
      "/getDeactiveEvent",
      verifyTokenPromotor,
      this.dashboardController.getEventDeactive
    );
    this.router.get(
      "/getTotalRevenue",
      verifyTokenPromotor,
      this.dashboardController.getTotalRevenue
    );

    //Routing untuk mendapatkan si event beserta pendapatan nya berdasarkan promotor yg telah login
    this.router.get(
      "/promotor/detailEventDashboard",
      verifyTokenPromotor,
      this.dashboardController.getPromotorEvents
    );
    this.router.get(
      "/getgrouprevenue",
      verifyTokenPromotor,
      this.dashboardController.getRevenueGroupedByPeriod
    );

    

    //Routing untuk mendapatkan si event beserta pendapatan nya berdasarkan ID
    // this.router.get(
    //   "/getEventDasboardbyID/:eventId",
    //   verifyTokenPromotor,
    //   this.dashboardController.getEventDetails
    // );
  }

  getRouter(): Router {
    return this.router;
  }
}
