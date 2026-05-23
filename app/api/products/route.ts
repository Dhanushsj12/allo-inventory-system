import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      inventories: true,
    },
  });

  return NextResponse.json(products);
}