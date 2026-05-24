import { NextResponse } from "next/server";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export async function GET() {
  const warehouses = await withDatabaseRetry(() =>
    prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json(warehouses);
}
