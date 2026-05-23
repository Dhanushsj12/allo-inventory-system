import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/")[3];

    console.log("RELEASE ID:", id);

    if (!id) {
      return NextResponse.json(
        { error: "ID not found" },
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

    await prisma.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.log("RELEASE ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}