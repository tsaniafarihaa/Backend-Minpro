"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateReview = void 0;
const joi_1 = __importDefault(require("joi"));
const validateCreateReview = (req, res, next) => {
    const schema = joi_1.default.object({
        eventId: joi_1.default.number().required(),
        rating: joi_1.default.number().min(1).max(5).required(),
        comment: joi_1.default.string().min(10).max(500).required(),
    });
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
};
exports.validateCreateReview = validateCreateReview;
