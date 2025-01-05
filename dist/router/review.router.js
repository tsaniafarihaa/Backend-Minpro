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
        // Create a review (requires user authentication)
        this.router.post("/create", verify_user_1.verifyTokenUser, this.reviewController.createReview);
        // Get reviews for a specific event (public route)
        this.router.get("/event/:eventId", this.reviewController.getEventReviews);
        // Get all events with reviews for a promotor (requires promotor authentication)
        this.router.get("/promotor/events", verify_promotor_1.verifyTokenPromotor, this.reviewController.getPromotorEvents);
    }
    getRouter() {
        return this.router;
    }
}
exports.ReviewRouter = ReviewRouter;
exports.reviewRouter = new ReviewRouter();
