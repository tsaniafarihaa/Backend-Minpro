import prisma from "../prisma";

export class EventDetailService {
  async getEventBySlug(slug: string) {
    try {
      const event = await prisma.event.findFirst({
        where: {
          slug: slug,
        },
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

      if (!event) {
        throw new Error("Event not found");
      }

      return event;
    } catch (error) {
      console.error("Error in getEventBySlug:", error);
      throw error;
    }
  }

  async getAllEvents() {
    try {
      return await prisma.event.findMany({
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
    } catch (error) {
      console.error("Error in getAllEvents:", error);
      throw error;
    }
  }

  async getEventById(id: number) {
    try {
      const event = await prisma.event.findUnique({
        where: {
          id: Number(id),
        },
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

      if (!event) {
        throw new Error("Event not found");
      }

      return event;
    } catch (error) {
      console.error("Error in getEventById:", error);
      throw error;
    }
  }
}
