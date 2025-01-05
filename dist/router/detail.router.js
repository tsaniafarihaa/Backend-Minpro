"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventDetailRouter = exports.EventDetailRouter = void 0;
const express_1 = require("express");
const detail_controller_1 = require("../controller/detail.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
const verify_1 = require("../middleware/verify");
class EventDetailRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.eventDetailController = new detail_controller_1.EventDetailController();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get("/", (0, asyncHandler_1.asyncHandler)(this.eventDetailController.getAllEvents));
        this.router.get("/search", (0, asyncHandler_1.asyncHandler)(this.eventDetailController.searchEvents));
        // Hapus verifyToken dari sini untuk akses publik
        this.router.get("/slug/:slug", (0, asyncHandler_1.asyncHandler)(this.eventDetailController.getEventBySlug));
        // Tambahkan route untuk ticket SEBELUM /:id
        this.router.get("/ticket/:id", verify_1.verifyToken, // Ticket tetap perlu verifikasi
        (0, asyncHandler_1.asyncHandler)(this.eventDetailController.getTicketById));
        this.router.get("/:id", (0, asyncHandler_1.asyncHandler)(this.eventDetailController.getEventById));
    }
    getRouter() {
        return this.router;
    }
}
exports.EventDetailRouter = EventDetailRouter;
exports.eventDetailRouter = new EventDetailRouter();
