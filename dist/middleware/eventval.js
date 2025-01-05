"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateEvent = exports.validateCreateEvent = void 0;
// src/middleware/eventval.ts
const joi_1 = __importDefault(require("joi"));
const ticketSchema = joi_1.default.object({
    category: joi_1.default.string().required(),
    price: joi_1.default.number().min(0).required(),
    quantity: joi_1.default.number().min(1).required(),
});
const updateTicketSchema = ticketSchema.keys({
    id: joi_1.default.number().required(),
});
const baseEventSchema = {
    title: joi_1.default.string().required(),
    category: joi_1.default.string()
        .valid("Music", "Orchestra", "Opera", "Other")
        .required(),
    location: joi_1.default.string()
        .valid("Bandung", "Bali", "Surabaya", "Jakarta")
        .required(),
    venue: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    date: joi_1.default.string().required(),
    time: joi_1.default.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
    eventType: joi_1.default.string().valid("free", "paid").required(),
};
const createEventSchema = joi_1.default.object(Object.assign(Object.assign({}, baseEventSchema), { tickets: joi_1.default.alternatives().conditional("eventType", {
        is: "paid",
        then: joi_1.default.array().items(ticketSchema).min(1).required(),
        otherwise: joi_1.default.array().items(ticketSchema).max(1),
    }) }));
const updateEventSchema = joi_1.default.object(Object.assign(Object.assign({}, baseEventSchema), { tickets: joi_1.default.alternatives().conditional("eventType", {
        is: "paid",
        then: joi_1.default.array().items(updateTicketSchema).min(1).required(),
        otherwise: joi_1.default.array().items(updateTicketSchema).max(1),
    }) }));
const validateSchema = (schema) => {
    return (req, res, next) => {
        try {
            if (typeof req.body.tickets === "string") {
                req.body.tickets = JSON.parse(req.body.tickets);
            }
            const { error } = schema.validate(req.body, { abortEarly: false });
            if (error) {
                res.status(400).json({
                    message: "Validation error",
                    errors: error.details.map((detail) => {
                        var _a;
                        return ({
                            field: (_a = detail.context) === null || _a === void 0 ? void 0 : _a.key,
                            message: detail.message,
                        });
                    }),
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(400).json({
                message: "Invalid request format",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };
};
exports.validateCreateEvent = validateSchema(createEventSchema);
exports.validateUpdateEvent = validateSchema(updateEventSchema);
