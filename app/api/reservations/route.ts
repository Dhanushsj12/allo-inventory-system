import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { productId, warehouseId, quantity } = body;

  return await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findFirst({
      where: { productId, warehouseId },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Inventory not found" });
    }

    const available = inventory.totalStock - inventory.reservedStock;

    if (available < quantity) {
      return NextResponse.json(
        { error: "Not enough stock" },
        { status: 400 }
      );
    }

    // ✅ ONLY reservedStock increases
    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedStock: {
          increment: quantity,
        },
      },
    });

    const reservation = await tx.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return NextResponse.json(reservation);
  });
}