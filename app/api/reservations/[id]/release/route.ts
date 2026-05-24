import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(reservation);
    }

    const inventory = await tx.inventory.findFirst({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedStock: { decrement: reservation.quantity },
      },
    });

    const updated = await tx.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return NextResponse.json(updated);
  });
}
