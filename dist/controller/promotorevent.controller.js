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
exports.PromotorEventsController = void 0;
const promotorevent_service_1 = require("../services/promotorevent.service");
class PromotorEventsController {
    constructor() {
        this.promotorEventService = new promotorevent_service_1.PromotorEventService();
    }
    getPromotorEvents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                console.log("Fetching events for promotor:", promotorId); // Debug log
                const events = yield this.promotorEventService.getPromotorEvents(promotorId);
                res.status(200).json(events);
            }
            catch (error) {
                console.error("Get promotor events error:", error);
                res.status(500).json({
                    message: "Failed to fetch events",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    getUpcomingEvents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const events = yield this.promotorEventService.getUpcomingEvents(promotorId);
                res.status(200).json(events);
            }
            catch (error) {
                console.error("Get upcoming events error:", error);
                res.status(500).json({
                    message: "Failed to fetch upcoming events",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    getPastEvents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotorId = (_a = req.promotor) === null || _a === void 0 ? void 0 : _a.id;
                if (!promotorId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const events = yield this.promotorEventService.getPastEvents(promotorId);
                res.status(200).json(events);
            }
            catch (error) {
                console.error("Get past events error:", error);
                res.status(500).json({
                    message: "Failed to fetch past events",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
}
exports.PromotorEventsController = PromotorEventsController;
