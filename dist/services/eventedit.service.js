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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditEventService = void 0;
// src/services/edit.service.ts
const prisma_1 = __importDefault(require("../prisma"));
const cloudinary_1 = require("./cloudinary");
class EditEventService {
    validateEventOwnership(eventId, promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = yield prisma_1.default.event.findFirst({
                where: {
                    id: eventId,
                    promotorId,
                },
            });
            return event !== null;
        });
    }
    updateEvent(eventId, data, file, promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verify event ownership
                const isOwner = yield this.validateEventOwnership(eventId, promotorId);
                if (!isOwner) {
                    throw new Error("Unauthorized to edit this event");
                }
                let thumbnailUrl;
                if (file) {
                    const result = yield (0, cloudinary_1.cloudinaryUpload)(file, "events");
                    thumbnailUrl = result.secure_url;
                }
                const eventDate = new Date(data.date);
                const [hours, minutes] = data.time.split(":");
                const eventTime = new Date(eventDate);
                eventTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                // Start a transaction
                const updatedEvent = yield prisma_1.default.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                    // Update main event details
                    const event = yield prisma.event.update({
                        where: { id: eventId },
                        data: Object.assign({ title: data.title, category: data.category, location: data.location, venue: data.venue, description: data.description, date: eventDate, time: eventTime }, (thumbnailUrl && { thumbnail: thumbnailUrl })),
                    });
                    // Update tickets
                    if (data.tickets && Array.isArray(data.tickets)) {
                        for (const ticket of data.tickets) {
                            yield prisma.ticket.update({
                                where: { id: ticket.id },
                                data: {
                                    category: ticket.category,
                                    price: ticket.price,
                                    quantity: ticket.quantity,
                                },
                            });
                        }
                    }
                    return event;
                }));
                // Fetch the complete updated event with tickets
                const completeEvent = yield prisma_1.default.event.findUnique({
                    where: { id: eventId },
                    include: {
                        tickets: true,
                        promotor: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                });
                return completeEvent;
            }
            catch (error) {
                console.error("Error in updateEvent service:", error);
                throw error;
            }
        });
    }
    getEventForEdit(eventId, promotorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const event = yield prisma_1.default.event.findFirst({
                    where: {
                        id: eventId,
                        promotorId,
                    },
                    include: {
                        tickets: true,
                    },
                });
                if (!event) {
                    throw new Error("Event not found or unauthorized");
                }
                return event;
            }
            catch (error) {
                console.error("Error in getEventForEdit service:", error);
                throw error;
            }
        });
    }
}
exports.EditEventService = EditEventService;
