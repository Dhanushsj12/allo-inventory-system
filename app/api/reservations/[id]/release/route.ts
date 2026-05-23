import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/")[3];

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // ❗ IMPORTANT FIX
    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Already processed" },
        { status: 400 }
      );
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}