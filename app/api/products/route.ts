
import { NextResponse } from "next/server";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export async function GET() {
  try {
    const products = await withDatabaseRetry(async () => {
      await prisma.$transaction(async (tx) => {
        await releaseExpiredReservations(tx);
      });

      return prisma.product.findMany({
        include: {
          inventories: {
            include: { warehouse: true },
            orderBy: { warehouse: { name: "asc" } },
          },
        },
        orderBy: { name: "asc" },
      });
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
  } catch (error: any) {
    console.error("PRODUCTS_ERROR", error);

    return NextResponse.json(
      {
        error:
          "Could not load products. Check DATABASE_URL and Supabase connection.",
        detail: error?.message,
      },
      { status: 500 }
    );
  }
}
