import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 🔥 AUTO RELEASE IF EXPIRED
  if (
    reservation.status === "PENDING" &&
    new Date(reservation.expiresAt) < new Date()
  ) {
    await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({
        where: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedStock: {
              decrement: reservation.quantity,
            },
          },
        });
      }

      await tx.reservation.update({
        where: { id },
        data: {
          status: "RELEASED",
        },
      });
    });

    return NextResponse.json({
      ...reservation,
      status: "RELEASED",
    });
  }

  return NextResponse.json(reservation);
}