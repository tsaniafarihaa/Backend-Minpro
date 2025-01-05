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
exports.OrderRouter = void 0;
const express_1 = require("express");
const order_controller_1 = require("../controller/order.controller");
const verify_user_1 = require("../middleware/verify.user");
class OrderRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.orderController = new order_controller_1.OrderController();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Update route handlers with proper Request typing
        this.router.post("/", // ini akan menjadi /api/orders
        verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.createOrder(req, res);
        }));
        this.router.get("/check-user-coupon", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.checkUserCoupon(req, res);
        }));
        this.router.get("/:id", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.getOrder(req, res);
        }));
        this.router.get("/history/user", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.getUserOrders(req, res);
        }));
        this.router.patch("/:id/status", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.updateOrderStatus(req, res);
        }));
        this.router.get("/coupon-count/:eventId", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.getCouponCount(req, res);
        }));
        this.router.get("/check-buy-event/:eventId", verify_user_1.verifyTokenUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.orderController.checkUserAllowedBuyEvent(req, res);
        }));
    }
    getRouter() {
        return this.router;
    }
}
exports.OrderRouter = OrderRouter;
