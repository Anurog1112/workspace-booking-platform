import { BookingStatus, PaymentStatus, Prisma, Role, RoomStatus, type Profile } from "@prisma/client";

import type { CreateBookingInput } from "@/server/validators/booking";
import type { ReviewPaymentInput, SubmitPaymentProofInput } from "@/server/validators/payment";
import type { RoomSearchInput } from "@/server/validators/room";

export const isDemoMode = process.env.DEMO_MODE === "true";

const demoPassword = "Password123!";
const now = new Date();

function daysFromNow(days: number, hour: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export const demoUsers = [
  {
    userId: "demo-user-super-admin",
    profileId: "demo-profile-super-admin",
    email: "superadmin@example.com",
    fullName: "Super Admin",
    role: Role.SUPER_ADMIN,
  },
  {
    userId: "demo-user-staff",
    profileId: "demo-profile-staff",
    email: "staff@example.com",
    fullName: "Workspace Staff",
    role: Role.STAFF,
  },
  {
    userId: "demo-user-member",
    profileId: "demo-profile-member",
    email: "member@example.com",
    fullName: "Demo Member",
    role: Role.MEMBER,
  },
];

export function getDemoAuthUser(email: string, password: string) {
  if (!isDemoMode || password !== demoPassword) {
    return null;
  }

  const demoUser = demoUsers.find((user) => user.email === email);

  if (!demoUser) {
    return null;
  }

  return {
    id: demoUser.userId,
    email: demoUser.email,
    name: demoUser.fullName,
    image: null,
  };
}

export function getDemoUserById(userId: string) {
  return demoUsers.find((user) => user.userId === userId);
}

export function getDemoUserByEmail(email: string) {
  return demoUsers.find((user) => user.email === email);
}

export function getDemoProfileByUserId(userId: string): Profile | null {
  const demoUser = getDemoUserById(userId);

  if (!demoUser) {
    return null;
  }

  return {
    id: demoUser.profileId,
    userId: demoUser.userId,
    fullName: demoUser.fullName,
    phone: null,
    role: demoUser.role,
    createdAt: now,
    updatedAt: now,
  };
}

export const demoBranches = [
  {
    id: "demo-branch-kmitl",
    name: "KMITL Lifelong Learning Center",
    address: "King Mongkut's Institute of Technology Ladkrabang",
    openingTime: new Date("1970-01-01T08:00:00.000Z"),
    closingTime: new Date("1970-01-01T20:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
  },
];

export const demoAmenities = [
  { id: "demo-amenity-projector", name: "Projector", icon: "presentation", createdAt: now },
  { id: "demo-amenity-whiteboard", name: "Whiteboard", icon: "pen-tool", createdAt: now },
  { id: "demo-amenity-wifi", name: "Wi-Fi", icon: "wifi", createdAt: now },
  { id: "demo-amenity-video", name: "Video Conference", icon: "video", createdAt: now },
  { id: "demo-amenity-power", name: "Power Outlet", icon: "plug", createdAt: now },
  { id: "demo-amenity-air", name: "Air Conditioning", icon: "snowflake", createdAt: now },
];

const branch = demoBranches[0];

export const demoRooms = [
  {
    id: "demo-room-focus-a",
    branchId: branch.id,
    name: "Focus Room A",
    description: "Small private room for focused discussion.",
    capacity: 4,
    hourlyRate: new Prisma.Decimal(250),
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
    status: RoomStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    branch,
    amenities: demoAmenities.slice(1, 6).map((amenity) => ({
      roomId: "demo-room-focus-a",
      amenityId: amenity.id,
      createdAt: now,
      amenity,
    })),
  },
  {
    id: "demo-room-meeting-b",
    branchId: branch.id,
    name: "Meeting Room B",
    description: "Standard meeting room for team collaboration.",
    capacity: 8,
    hourlyRate: new Prisma.Decimal(450),
    imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80",
    status: RoomStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    branch,
    amenities: demoAmenities.slice(0, 5).map((amenity) => ({
      roomId: "demo-room-meeting-b",
      amenityId: amenity.id,
      createdAt: now,
      amenity,
    })),
  },
  {
    id: "demo-room-workshop-c",
    branchId: branch.id,
    name: "Workshop Room C",
    description: "Large room for workshop and training sessions.",
    capacity: 20,
    hourlyRate: new Prisma.Decimal(900),
    imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    status: RoomStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    branch,
    amenities: demoAmenities.map((amenity) => ({
      roomId: "demo-room-workshop-c",
      amenityId: amenity.id,
      createdAt: now,
      amenity,
    })),
  },
];

const member = demoUsers[2];
const staff = demoUsers[1];
const demoMemberProfile = getDemoProfileByUserId(member.userId);

if (!demoMemberProfile) {
  throw new Error("Demo member profile is missing.");
}

const demoPayments = {
  waiting: {
    id: "demo-payment-waiting",
    bookingId: "demo-booking-waiting",
    amount: new Prisma.Decimal(250),
    proofFileUrl: null,
    status: PaymentStatus.WAITING_UPLOAD,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  },
  pending: {
    id: "demo-payment-pending",
    bookingId: "demo-booking-pending",
    amount: new Prisma.Decimal(900),
    proofFileUrl: "https://example.com/payment-proof/pending-review.png",
    status: PaymentStatus.PENDING_REVIEW,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  },
  approved: {
    id: "demo-payment-approved",
    bookingId: "demo-booking-approved",
    amount: new Prisma.Decimal(900),
    proofFileUrl: "https://example.com/payment-proof/approved.png",
    status: PaymentStatus.APPROVED,
    reviewedById: staff.profileId,
    reviewedAt: now,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  },
};

export const demoBookings = [
  {
    id: "demo-booking-waiting",
    roomId: demoRooms[0].id,
    memberId: member.profileId,
    startAt: daysFromNow(1, 9),
    endAt: daysFromNow(1, 10),
    attendeeCount: 3,
    totalPrice: new Prisma.Decimal(250),
    status: BookingStatus.PENDING_PAYMENT,
    purpose: "Demo payment upload flow",
    paymentDueAt: daysFromNow(1, 8),
    createdAt: now,
    updatedAt: now,
    room: demoRooms[0],
    member: demoMemberProfile,
    payment: demoPayments.waiting,
    checkin: null,
  },
  {
    id: "demo-booking-pending",
    roomId: demoRooms[1].id,
    memberId: member.profileId,
    startAt: daysFromNow(1, 11),
    endAt: daysFromNow(1, 13),
    attendeeCount: 6,
    totalPrice: new Prisma.Decimal(900),
    status: BookingStatus.PENDING_REVIEW,
    purpose: "Demo staff review flow",
    paymentDueAt: daysFromNow(1, 10),
    createdAt: now,
    updatedAt: now,
    room: demoRooms[1],
    member: demoMemberProfile,
    payment: demoPayments.pending,
    checkin: null,
  },
  {
    id: "demo-booking-approved",
    roomId: demoRooms[1].id,
    memberId: member.profileId,
    startAt: daysFromNow(2, 10),
    endAt: daysFromNow(2, 12),
    attendeeCount: 6,
    totalPrice: new Prisma.Decimal(900),
    status: BookingStatus.CONFIRMED,
    purpose: "Demo confirmed booking",
    paymentDueAt: daysFromNow(2, 9),
    createdAt: now,
    updatedAt: now,
    room: demoRooms[1],
    member: demoMemberProfile,
    payment: demoPayments.approved,
    checkin: null,
  },
];

export function getDemoRooms(filters: RoomSearchInput = {}) {
  return demoRooms.filter((room) => {
    if (filters.branchId && room.branchId !== filters.branchId) {
      return false;
    }

    if (filters.status && room.status !== filters.status) {
      return false;
    }

    if (filters.capacity && room.capacity < filters.capacity) {
      return false;
    }

    return true;
  });
}

export function getDemoBookingsForMember(memberId: string) {
  return demoBookings.filter((booking) => booking.memberId === memberId);
}

export function createDemoBooking(memberId: string, input: CreateBookingInput) {
  const room = demoRooms.find((item) => item.id === input.roomId) ?? demoRooms[0];

  return {
    ...demoBookings[0],
    id: "demo-booking-created",
    roomId: room.id,
    memberId,
    startAt: input.startAt,
    endAt: input.endAt,
    attendeeCount: input.attendeeCount,
    purpose: input.purpose ?? null,
    room,
  };
}

export function submitDemoPaymentProof(_memberId: string, input: SubmitPaymentProofInput) {
  return {
    ...demoBookings[0],
    id: input.bookingId,
    status: BookingStatus.PENDING_REVIEW,
    payment: {
      ...demoPayments.pending,
      bookingId: input.bookingId,
      proofFileUrl: input.proofFileUrl,
    },
  };
}

export function reviewDemoPayment(_staffProfileId: string, input: ReviewPaymentInput) {
  return {
    ...demoBookings[1],
    id: input.bookingId,
    status: input.approved ? BookingStatus.CONFIRMED : BookingStatus.REJECTED,
    payment: {
      ...demoPayments.pending,
      bookingId: input.bookingId,
      status: input.approved ? PaymentStatus.APPROVED : PaymentStatus.REJECTED,
      rejectionReason: input.approved ? null : input.rejectionReason ?? null,
      reviewedAt: now,
    },
  };
}
