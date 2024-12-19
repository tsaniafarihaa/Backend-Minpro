import { Request, Response } from "express";
import { EventDetailService } from "../services/detail.service";

export class EventDetailController {
  private eventDetailService: EventDetailService;

  constructor() {
    this.eventDetailService = new EventDetailService();
  }

  getAllEvents = async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await this.eventDetailService.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({
        message: "Failed to fetch events",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  getEventById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid event ID" });
        return;
      }

      const event = await this.eventDetailService.getEventById(id);
      res.json(event);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({
        message: "Failed to fetch event",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  getEventBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
      const event = await this.eventDetailService.getEventBySlug(
        req.params.slug
      );
      res.json(event);
    } catch (error) {
      console.error("Get event by slug error:", error);
      res.status(500).json({
        message: "Failed to fetch event",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
