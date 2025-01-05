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
exports.editEventRouter = exports.EditEventRouter = void 0;
// src/router/edit.router.ts
const express_1 = require("express");
const edit_controller_1 = require("../controller/edit.controller");
const verify_promotor_1 = require("../middleware/verify.promotor");
const eventval_1 = require("../middleware/eventval");
const uploader_1 = require("../services/uploader");
const asyncHandler_1 = require("../utils/asyncHandler");
class EditEventRouter {
    constructor() {
        this.validateTickets = (req, res, next) => {
            if (req.body.tickets && typeof req.body.tickets === "string") {
                try {
                    req.body.tickets = JSON.parse(req.body.tickets);
                    next();
                }
                catch (error) {
                    res.status(400).json({
                        message: "Invalid tickets format",
                        error: "Tickets must be a valid JSON array",
                    });
                    return;
                }
            }
            else {
                next();
            }
        };
        this.router = (0, express_1.Router)();
        this.editEventController = new edit_controller_1.EditEventController();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Get event for editing
        this.router.get("/:id", verify_promotor_1.verifyTokenPromotor, (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.editEventController.getEventForEdit(req, res);
        })));
        // Update event
        this.router.patch("/:id", verify_promotor_1.verifyTokenPromotor, (0, uploader_1.uploader)("memoryStorage", "event-").single("banner"), this.validateTickets, eventval_1.validateUpdateEvent, (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.editEventController.updateEvent(req, res);
        })));
    }
    getRouter() {
        return this.router;
    }
}
exports.EditEventRouter = EditEventRouter;
exports.editEventRouter = new EditEventRouter();
