"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRouter = exports.ReviewRouter = void 0;
// src/router/review.router.ts
const express_1 = require("express");
const review_controller_1 = require("../controller/review.controller");
const verify_user_1 = require("../middleware/verify.user");
const verify_promotor_1 = require("../middleware/verify.promotor");
class ReviewRouter {
    constructor() {
        this.reviewController = new review_controller_1.ReviewController();
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post("/create", verify_user_1.verifyTokenUser, this.reviewController.createReview);
        this.router.get("/event/:eventId", this.reviewController.getEventReviews);
        this.router.get("/promotor/events", verify_promotor_1.verifyTokenPromotor, this.reviewController.getPromotorEvents);
    }
    getRouter() {
        return this.router;
    }
}
exports.ReviewRouter = ReviewRouter;
exports.reviewRouter = new ReviewRouter();
