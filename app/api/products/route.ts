
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET() {
  await prisma.$transaction(async (tx) => {
    await releaseExpiredReservations(tx);
  });

  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    products.map((product) => ({
      id: product.id,
      name: product.name,
      warehouses: product.inventories.map((inventory) => ({
        inventoryId: inventory.id,
        warehouseId: inventory.warehouseId,
        warehouseName: inventory.warehouse.name,
        totalStock: inventory.totalStock,
        reservedStock: inventory.reservedStock,
        availableStock: inventory.totalStock - inventory.reservedStock,
      })),
    }))
  );
}
