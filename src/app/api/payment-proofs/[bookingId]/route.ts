import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { AuthRequiredError, ForbiddenError, requireRole, type AuthContext } from "@/server/guards";
import { getBookingForProfile } from "@/server/services/booking-service";

const inlineProofPattern = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([\s\S]+)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  let context: AuthContext;

  try {
    context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return new Response("Authentication required.", { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return new Response("Forbidden.", { status: 403 });
    }

    throw error;
  }
  const { bookingId } = await params;
  const booking = await getBookingForProfile({
    bookingId,
    profileId: context.profile.id,
    role: context.profile.role,
  });
  const proofLocation = booking?.payment?.proofFileUrl;

  if (!proofLocation) {
    return new Response("Payment proof not found.", { status: 404 });
  }

  const inlineProof = proofLocation.match(inlineProofPattern);

  if (inlineProof) {
    const [, contentType, base64Data] = inlineProof;
    const fileExtension = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];

    return new Response(Buffer.from(base64Data, "base64"), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="payment-proof.${fileExtension}"`,
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (proofLocation.startsWith("https://")) {
    return NextResponse.redirect(proofLocation);
  }

  return new Response("Payment proof location is invalid.", { status: 422 });
}
