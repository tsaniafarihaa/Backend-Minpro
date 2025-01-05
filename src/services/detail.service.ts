import prisma from "../prisma";

export class EventDetailService {
  async getEventBySlug(slug: string, userId: string) {
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

      const hasUserPurchase = await prisma.order.findFirst({
        where: {
          AND: {
            user: {
              id: userId,
            },
            event: {
              id: event.id,
            },
          },
        },
        include: {
          event: true,
        },
      });

      console.log(userId, "userId");
      console.log(hasUserPurchase, "hasUserPurchase");

      let isPurchased = false;

      if (hasUserPurchase) {
        isPurchased = true;
      } else {
        isPurchased = false;
      }

      return {
        ...event,
        isPurchased,
      };
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

  async getEventById(id: number, userId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: {
          id: id,
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

      const hasUserPurchase = await prisma.order.findFirst({
        where: {
          userId,
          event: {
            id: id,
          },
        },
        include: {
          event: true,
        },
      });

      console.log(hasUserPurchase, "hasUserPurchase");
      let isPurchased = false;

      if (hasUserPurchase) {
        isPurchased = true;
      } else {
        isPurchased = false;
      }

      return {
        ...event,
        isPurchased,
      };
    } catch (error) {
      console.error("Error in getEventById:", error);
      throw error;
    }
  }

  async getFilteredEvents(
    page: number = 1,
    limit: number = 9,
    search?: string,
    category?: string,
    location?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (category && category !== "all") {
        whereClause.category = category;
      }

      if (location && location !== "all") {
        whereClause.location = location;
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where: whereClause,
          skip,
          take: limit,
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
        }),
        prisma.event.count({ where: whereClause }),
      ]);

      return {
        events,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Error in getFilteredEvents:", error);
      throw error;
    }
  }

  // Tambahkan method baru
  async getTicketById(ticketId: number) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },
        include: {
          event: {
            include: {
              promotor: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      return ticket;
    } catch (error) {
      console.error("Error in getTicketById:", error);
      throw error;
    }
  }
}
