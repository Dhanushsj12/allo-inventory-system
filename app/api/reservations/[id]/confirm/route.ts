import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: Request) {
  try {
    // ✅ GET ID FROM URL (WORKS ALWAYS)
    const url = new URL(req.url);
    const id = url.pathname.split("/")[3];

    console.log("CONFIRM ID:", id);

    if (!id) {
      return NextResponse.json(
        { error: "ID not found in URL" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Already processed" },
        { status: 400 }
      );
    }

    if (new Date() > reservation.expiresAt) {
      return NextResponse.json(
        { error: "Reservation expired" },
        { status: 400 }
      );
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.log("CONFIRM ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}