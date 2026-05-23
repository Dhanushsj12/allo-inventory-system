import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany();

  return NextResponse.json(warehouses);
}