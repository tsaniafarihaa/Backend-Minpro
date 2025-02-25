import prisma from "../prisma";
import { cloudinaryUpload } from "./cloudinary";
import { Prisma } from "../../prisma/generated/client";

export class CreateEventService {
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async createEvent(
    data: any,
    file?: Express.Multer.File,
    promotorId?: string
  ) {
    try {
      let thumbnailUrl: string | undefined;

      if (file) {
        const result = await cloudinaryUpload(file, "events");
        thumbnailUrl = result.secure_url;
      }

      // Handle date and time
      const eventDate = new Date(data.date);
      let eventTime = eventDate; // Gunakan eventDate sebagai base
      const [hours, minutes] = data.time.split(":");
      // Langsung set waktu yang diterima tanpa kondisi default
      eventTime.setHours(parseInt(hours), parseInt(minutes));
      console.log("Time being set:", { hours, minutes, eventTime }); // Untuk debugging

      // Generate slug
      const baseSlug = this.generateSlug(data.title);
      let finalSlug = baseSlug;
      let counter = 1;

      while (await this.isSlugExists(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create event data
      const eventData: Prisma.EventCreateInput = {
        title: data.title,
        slug: finalSlug,
        thumbnail: thumbnailUrl,
        category: data.category,
        location: data.location,
        venue: data.venue,
        description: data.description,
        date: eventDate,
        time: eventTime,
        promotor: promotorId
          ? {
              connect: { id: promotorId },
            }
          : undefined,
        tickets: {
          create: data.tickets.map((ticket: any) => ({
            category: ticket.category,
            price: ticket.price,
            quantity: ticket.quantity,
          })),
        },
      };

      // Create event with tickets
      const event = await prisma.event.create({
        data: eventData,
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

      return event;
    } catch (error) {
      console.error("Detailed error in CreateEventService:", error);
      throw error;
    }
  }

  private async isSlugExists(slug: string): Promise<boolean> {
    const existingEvent = await prisma.event.findFirst({
      where: { slug },
    });
    return !!existingEvent;
  }

  async getAllEvents() {
    return prisma.event.findMany({
      include: {
        tickets: true,
        promotor: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });
  }

  async getEventById(id: number) {
    return prisma.event.findUnique({
      where: { id },
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
  }

  async getEventBySlug(slug: string) {
    return prisma.event.findFirst({
      where: { slug },
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
  }
}
