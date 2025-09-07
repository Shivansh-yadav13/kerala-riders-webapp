import { prisma } from "@/lib/database";
import { Event, EventParticipant, User } from "@prisma/client";

export interface CreateEventData {
  title: string;
  description?: string | null;
  date: Date;
  location: string;
  maxParticipants?: number | null;
  category: string;
  difficulty?: string | null;
  distance?: number | null;
  registrationDeadline?: Date | null;
}

export interface UpdateEventData {
  title?: string;
  description?: string | null;
  date?: Date;
  location?: string;
  maxParticipants?: number | null;
  category?: string;
  difficulty?: string | null;
  distance?: number | null;
  registrationDeadline?: Date | null;
}

export interface EventFilters {
  category?: string;
  difficulty?: string;
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
}

export interface EventWithDetails extends Event {
  creator: Pick<User, 'krid' | 'name' | 'email'>;
  participants: (EventParticipant & {
    user: Pick<User, 'krid' | 'name' | 'email'>;
  })[];
  participantCount: number;
  userParticipation?: EventParticipant | null;
}

/**
 * Create a new event
 */
export const createEvent = async (
  eventData: CreateEventData,
  createdBy: string
): Promise<{ event: EventWithDetails | null; error: Error | null }> => {
  try {
    console.log("📅 Creating new event:", eventData.title);

    const event = await prisma.event.create({
      data: {
        ...eventData,
        createdBy,
      },
      include: {
        creator: {
          select: { krid: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { krid: true, name: true, email: true }
            }
          }
        }
      }
    });

    const eventWithDetails: EventWithDetails = {
      ...event,
      participantCount: 0,
      userParticipation: null,
    };

    console.log("✅ Event created successfully:", event.id);
    return { event: eventWithDetails, error: null };
  } catch (error) {
    console.error("❌ Error creating event:", error);
    return { event: null, error: error as Error };
  }
};

/**
 * Get events with optional filters
 */
export const getEvents = async (
  filters?: EventFilters,
  currentUserKRId?: string
): Promise<{ events: EventWithDetails[]; error: Error | null }> => {
  try {
    const where: any = {
      isActive: true,
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    if (filters?.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive'
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: {
          select: { krid: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { krid: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    const eventsWithDetails: EventWithDetails[] = events.map(event => ({
      ...event,
      participantCount: event.participants.filter(p => p.status === 'registered').length,
      userParticipation: currentUserKRId 
        ? event.participants.find(p => p.userKRId === currentUserKRId) || null
        : null,
    }));

    console.log("✅ Found", eventsWithDetails.length, "events");
    return { events: eventsWithDetails, error: null };
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    return { events: [], error: error as Error };
  }
};

/**
 * Get single event by ID
 */
export const getEventById = async (
  eventId: string,
  currentUserKRId?: string
): Promise<{ event: EventWithDetails | null; error: Error | null }> => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        isActive: true
      },
      include: {
        creator: {
          select: { krid: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { krid: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!event) {
      return { event: null, error: new Error("Event not found") };
    }

    const eventWithDetails: EventWithDetails = {
      ...event,
      participantCount: event.participants.filter(p => p.status === 'registered').length,
      userParticipation: currentUserKRId 
        ? event.participants.find(p => p.userKRId === currentUserKRId) || null
        : null,
    };

    console.log("✅ Found event:", event.title);
    return { event: eventWithDetails, error: null };
  } catch (error) {
    console.error("❌ Error fetching event:", error);
    return { event: null, error: error as Error };
  }
};

/**
 * Join an event
 */
export const joinEvent = async (
  eventId: string,
  userKRId: string
): Promise<{ participation: EventParticipant | null; error: Error | null }> => {
  try {
    console.log("🔗 User", userKRId, "joining event", eventId);

    // Check if user already participating
    const existingParticipation = await prisma.eventParticipant.findFirst({
      where: {
        eventId,
        userKRId
      }
    });

    if (existingParticipation) {
      return { participation: null, error: new Error("User already participating in this event") };
    }

    // Get event to check capacity
    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      include: { participants: true }
    });

    if (!event) {
      return { participation: null, error: new Error("Event not found") };
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return { participation: null, error: new Error("Registration deadline has passed") };
    }

    // Determine status based on capacity
    const registeredCount = event.participants.filter(p => p.status === 'registered').length;
    const status = event.maxParticipants && registeredCount >= event.maxParticipants 
      ? 'waitlist' 
      : 'registered';

    const participation = await prisma.eventParticipant.create({
      data: {
        eventId,
        userKRId,
        status,
      }
    });

    console.log("✅ User joined event with status:", status);
    return { participation, error: null };
  } catch (error) {
    console.error("❌ Error joining event:", error);
    return { participation: null, error: error as Error };
  }
};

/**
 * Leave an event
 */
export const leaveEvent = async (
  eventId: string,
  userKRId: string
): Promise<{ error: Error | null }> => {
  try {
    console.log("🚪 User", userKRId, "leaving event", eventId);

    const result = await prisma.eventParticipant.deleteMany({
      where: {
        eventId,
        userKRId
      }
    });

    if (result.count === 0) {
      return { error: new Error("User is not participating in this event") };
    }

    // Check if we need to promote someone from waitlist
    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      include: { 
        participants: {
          where: { status: 'waitlist' },
          orderBy: { registeredAt: 'asc' }
        }
      }
    });

    if (event && event.maxParticipants) {
      const registeredCount = await prisma.eventParticipant.count({
        where: { eventId, status: 'registered' }
      });

      // If there's space and someone on waitlist, promote them
      if (registeredCount < event.maxParticipants && event.participants.length > 0) {
        await prisma.eventParticipant.update({
          where: { id: event.participants[0].id },
          data: { status: 'registered' }
        });
        console.log("✅ Promoted user from waitlist to registered");
      }
    }

    console.log("✅ User left event successfully");
    return { error: null };
  } catch (error) {
    console.error("❌ Error leaving event:", error);
    return { error: error as Error };
  }
};

/**
 * Update an event (creator only)
 */
export const updateEvent = async (
  eventId: string,
  updates: UpdateEventData,
  userKRId: string
): Promise<{ event: EventWithDetails | null; error: Error | null }> => {
  try {
    console.log("📝 Updating event", eventId, "by user", userKRId);

    // Check if user is the creator
    const existingEvent = await prisma.event.findFirst({
      where: { id: eventId, isActive: true }
    });

    if (!existingEvent) {
      return { event: null, error: new Error("Event not found") };
    }

    if (existingEvent.createdBy !== userKRId) {
      return { event: null, error: new Error("Only the event creator can update this event") };
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updates,
      include: {
        creator: {
          select: { krid: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { krid: true, name: true, email: true }
            }
          }
        }
      }
    });

    const eventWithDetails: EventWithDetails = {
      ...updatedEvent,
      participantCount: updatedEvent.participants.filter(p => p.status === 'registered').length,
      userParticipation: updatedEvent.participants.find(p => p.userKRId === userKRId) || null,
    };

    console.log("✅ Event updated successfully");
    return { event: eventWithDetails, error: null };
  } catch (error) {
    console.error("❌ Error updating event:", error);
    return { event: null, error: error as Error };
  }
};

/**
 * Delete an event (creator only) - soft delete
 */
export const deleteEvent = async (
  eventId: string,
  userKRId: string
): Promise<{ error: Error | null }> => {
  try {
    console.log("🗑️ Deleting event", eventId, "by user", userKRId);

    // Check if user is the creator and update
    const result = await prisma.event.updateMany({
      where: {
        id: eventId,
        createdBy: userKRId,
        isActive: true
      },
      data: { isActive: false }
    });

    if (result.count === 0) {
      return { error: new Error("Event not found or you are not the creator") };
    }

    console.log("✅ Event deleted successfully (soft delete)");
    return { error: null };
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    return { error: error as Error };
  }
};

/**
 * Get user's events (both created and joined)
 */
export const getUserEvents = async (
  userKRId: string
): Promise<{ 
  createdEvents: EventWithDetails[]; 
  joinedEvents: EventWithDetails[]; 
  error: Error | null 
}> => {
  try {
    console.log("📋 Fetching events for user", userKRId);

    // Get created events
    const createdEvents = await prisma.event.findMany({
      where: {
        createdBy: userKRId,
        isActive: true
      },
      include: {
        creator: {
          select: { krid: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { krid: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get joined events
    const participations = await prisma.eventParticipant.findMany({
      where: {
        userKRId,
        status: 'registered',
        event: { isActive: true }
      },
      include: {
        event: {
          include: {
            creator: {
              select: { krid: true, name: true, email: true }
            },
            participants: {
              include: {
                user: {
                  select: { krid: true, name: true, email: true }
                }
              }
            }
          }
        }
      },
      orderBy: { event: { date: 'asc' } }
    });

    const createdEventsWithDetails: EventWithDetails[] = createdEvents.map(event => ({
      ...event,
      participantCount: event.participants.filter(p => p.status === 'registered').length,
      userParticipation: event.participants.find(p => p.userKRId === userKRId) || null,
    }));

    const joinedEventsWithDetails: EventWithDetails[] = participations.map(participation => ({
      ...participation.event,
      participantCount: participation.event.participants.filter(p => p.status === 'registered').length,
      userParticipation: participation,
    }));

    console.log("✅ Found", createdEventsWithDetails.length, "created and", joinedEventsWithDetails.length, "joined events");
    return { 
      createdEvents: createdEventsWithDetails, 
      joinedEvents: joinedEventsWithDetails, 
      error: null 
    };
  } catch (error) {
    console.error("❌ Error fetching user events:", error);
    return { 
      createdEvents: [], 
      joinedEvents: [], 
      error: error as Error 
    };
  }
};