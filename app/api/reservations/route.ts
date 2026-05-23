import { NextResponse } from "next/server";
import { createReservation } from "@/src/lib/services/reservation.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { productId, warehouseId, quantity } = body;

    if (!productId || !warehouseId || !quantity) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const reservation = await createReservation(
      productId,
      warehouseId,
      quantity
    );

    return NextResponse.json(reservation);

  } catch (error: any) {
    console.log("ERROR:", error);  // 👈 THIS WILL SHOW REAL ERROR

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}