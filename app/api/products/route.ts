import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      inventories: true,
    },
  });

  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    inventories: p.inventories.map((inv) => ({
      id: inv.id,
      warehouseId: inv.warehouseId,
      totalStock: inv.totalStock,
      reservedStock: inv.reservedStock,

      //  IMPORTANT FIX
      availableStock: inv.totalStock - inv.reservedStock,
    })),
  }));

  return NextResponse.json(result);
}