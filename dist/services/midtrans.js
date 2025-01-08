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
exports.midtransService = void 0;
const midtransClient = require("midtrans-client");
class MidtransService {
    constructor() {
        const config = {
            isProduction: false,
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY,
            timeoutMs: 30000, // Add timeout
        };
        this.core = new midtransClient.CoreApi(config);
        this.snap = new midtransClient.Snap(config);
    }
    createTransaction(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parameter = {
                    transaction_details: {
                        order_id: params.orderId,
                        gross_amount: params.amount,
                    },
                    item_details: params.itemDetails,
                    customer_details: {
                        first_name: params.customerDetails.firstName,
                        email: params.customerDetails.email,
                    },
                    callbacks: params.callbacks,
                };
                return yield this.snap.createTransaction(parameter);
            }
            catch (error) {
                console.error("Create transaction error:", error);
                throw error;
            }
        });
    }
    handleNotification(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.core.transaction.notification(notification);
            }
            catch (error) {
                console.error("Notification error:", error);
                throw error;
            }
        });
    }
    getStatus(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.core.transaction.status(orderId);
            }
            catch (error) {
                console.error("Get status error:", error);
                throw error;
            }
        });
    }
}
exports.midtransService = new MidtransService();
