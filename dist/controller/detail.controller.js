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
exports.EventDetailController = void 0;
const detail_service_1 = require("../services/detail.service");
class EventDetailController {
    constructor() {
        this.getAllEvents = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const events = yield this.eventDetailService.getAllEvents();
                res.status(200).json(events);
            }
            catch (error) {
                console.error("Error in getAllEvents:", error);
                res.status(500).json({ message: "Error fetching events" });
            }
        });
        this.getEventBySlug = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { slug } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const event = yield this.eventDetailService.getEventBySlug(slug, userId || "");
                res.status(200).json(event);
            }
            catch (error) {
                console.error("Error in getEventBySlug:", error);
                res.status(500).json({ message: "Error fetching event" });
            }
        });
        this.getTicketById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const ticketId = parseInt(req.params.id);
                const ticket = yield this.eventDetailService.getTicketById(ticketId);
                if (!ticket) {
                    res.status(404).json({ message: "Ticket not found" });
                    return;
                }
                res.status(200).json(ticket);
            }
            catch (error) {
                console.error("Error in getTicketById:", error);
                res.status(500).json({ message: "Error fetching ticket" });
            }
        });
        this.searchEvents = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 9;
                const search = req.query.search;
                const category = req.query.category;
                const location = req.query.location;
                const result = yield this.eventDetailService.getFilteredEvents(page, limit, search, category, location);
                res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in searchEvents:", error);
                res.status(500).json({ message: "Error searching events" });
            }
        });
        this.eventDetailService = new detail_service_1.EventDetailService();
    }
    // src/controller/detail.controller.ts
    getEventById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const id = parseInt(req.params.id);
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (isNaN(id)) {
                    res.status(400).json({ message: "Invalid event ID" });
                    return;
                }
                const event = yield this.eventDetailService.getEventById(id, userId || "");
                res.status(200).json(event);
            }
            catch (error) {
                console.error("Error in getEventById:", error);
                res.status(500).json({ message: "Error fetching event" });
            }
        });
    }
}
exports.EventDetailController = EventDetailController;
