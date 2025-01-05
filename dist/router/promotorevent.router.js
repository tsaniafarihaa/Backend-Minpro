"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotorEventsRouter = void 0;
// src/router/promotor.events.router.ts
const express_1 = require("express");
const promotorevent_controller_1 = require("../controller/promotorevent.controller");
const verify_promotor_1 = require("../middleware/verify.promotor");
class PromotorEventsRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.controller = new promotorevent_controller_1.PromotorEventsController();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Get all events
        this.router.get("/", verify_promotor_1.verifyTokenPromotor, (req, res) => {
            this.controller.getPromotorEvents(req, res);
        });
        // Get upcoming events
        this.router.get("/upcoming", verify_promotor_1.verifyTokenPromotor, (req, res) => {
            this.controller.getUpcomingEvents(req, res);
        });
        // Get past events
        this.router.get("/past", verify_promotor_1.verifyTokenPromotor, (req, res) => {
            this.controller.getPastEvents(req, res);
        });
    }
    getRouter() {
        return this.router;
    }
}
exports.PromotorEventsRouter = PromotorEventsRouter;
