import { Request, Response } from "express";
import prisma from "../prisma";
import { cloudinaryUpload } from "../services/cloudinary";

export class EditEventController {
  async getEventForEdit(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      const promotorId = req.promotor?.id;

      if (!promotorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          promotorId,
        },
        include: {
          tickets: true,
        },
      });

      if (!event) {
        return res
          .status(404)
          .json({ message: "Event not found or unauthorized" });
      }

      // Format the time for frontend consumption
      const formattedEvent = {
        ...event,
        time: event.time.toTimeString().slice(0, 5),

        date: new Date(event.date).toISOString().split("T")[0],
      };

      return res.status(200).json(formattedEvent);
    } catch (error) {
      console.error("Detailed error:", error);
      return res.status(500).json({
        message: "Failed to fetch event",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      const promotorId = req.promotor?.id;

      console.log("Request body before processing:", req.body);

      if (!promotorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if event exists and belongs to promotor
      const existingEvent = await prisma.event.findFirst({
        where: {
          id: eventId,
          promotorId,
        },
      });

      if (!existingEvent) {
        return res
          .status(404)
          .json({ message: "Event not found or unauthorized" });
      }

      // Handle file upload if there's a new banner
      let thumbnailUrl = existingEvent.thumbnail;
      if (req.file) {
        const result = await cloudinaryUpload(req.file, "events");
        thumbnailUrl = result.secure_url;
      }

      const eventDate = new Date(req.body.date);

      let eventTime = eventDate; // Gunakan eventDate sebagai base
      if (req.body.time) {
        const [hours, minutes] = req.body.time.split(":");
        eventTime.setHours(parseInt(hours), parseInt(minutes));
        console.log("Time being set:", { hours, minutes, eventTime }); // Tambah log untuk debugging
      } else {
        eventTime = existingEvent.time;
      }
      console.log("Processed time:", eventTime);

      // Parse tickets data
      let tickets;
      try {
        tickets =
          typeof req.body.tickets === "string"
            ? JSON.parse(req.body.tickets)
            : req.body.tickets;

        if (!Array.isArray(tickets)) {
          throw new Error("Tickets must be an array");
        }

        // Validate each ticket
        tickets.forEach((ticket: any) => {
          if (
            !ticket.id ||
            !ticket.category ||
            typeof ticket.price === "undefined" ||
            typeof ticket.quantity === "undefined"
          ) {
            throw new Error("Invalid ticket structure");
          }
        });
      } catch (error) {
        console.error("Error parsing tickets:", error);
        return res.status(400).json({
          message: "Invalid tickets format",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Update event using transaction
      const updatedEvent = await prisma.$transaction(async (prisma) => {
        // Update main event details
        const event = await prisma.event.update({
          where: { id: eventId },
          data: {
            title: req.body.title,
            category: req.body.category,
            location: req.body.location,
            venue: req.body.venue,
            description: req.body.description,
            date: eventDate,
            time: eventTime,
            thumbnail: thumbnailUrl,
          },
          include: {
            tickets: true,
          },
        });

        // Update tickets
        for (const ticket of tickets) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              category: ticket.category,
              price: Number(ticket.price),
              quantity: Number(ticket.quantity),
            },
          });
        }

        return event;
      });

      // Format the response
      const formattedEvent = {
        ...updatedEvent,
        time: new Date(updatedEvent.time).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: new Date(updatedEvent.date).toISOString().split("T")[0],
      };

      return res.status(200).json({
        message: "Event updated successfully",
        data: formattedEvent,
      });
    } catch (error) {
      console.error("Update event error:", error);
      return res.status(500).json({
        message: "Failed to update event",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
