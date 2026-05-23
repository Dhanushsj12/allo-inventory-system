import { NextResponse } from "next/server";
import { createReservation } from "@/src/lib/services/reservation.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { productId, warehouseId, quantity } = body;

    const reservation = await createReservation(
      productId,
      warehouseId,
      quantity
    );

    return NextResponse.json(reservation);

  } catch (error: any) {

    // IMPORTANT FIX (409)
    if (error.message === "Not enough stock") {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}