import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

const RESERVATION_MINUTES = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quantity = Number(body.quantity ?? 1);

    if (!body.productId || !body.warehouseId || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Product, warehouse, and a valid quantity are required." },
        { status: 400 }
      );
    }

    const reservation = await prisma.$transaction(async (tx) => {
      await releaseExpiredReservations(tx);

      const updated = await tx.$queryRaw<{ id: string }[]>`
        UPDATE "Inventory"
        SET "reservedStock" = "reservedStock" + ${quantity}
        WHERE "productId" = ${body.productId}
          AND "warehouseId" = ${body.warehouseId}
          AND ("totalStock" - "reservedStock") >= ${quantity}
        RETURNING "id"
      `;

      if (updated.length !== 1) {
        return null;
      }

      return tx.reservation.create({
        data: {
          productId: body.productId,
          warehouseId: body.warehouseId,
          quantity,
          expiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
          status: "PENDING",
        },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Not enough stock available." },
        { status: 409 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("RESERVATION ERROR:", error);

    return NextResponse.json(
      { error: "Reservation failed" },
      { status: 500 }
    );
  }
}
