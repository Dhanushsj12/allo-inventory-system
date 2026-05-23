import { prisma } from "../prisma";

export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number
) {
  return await prisma.$transaction(async (tx) => {

    // 1️⃣ Find inventory
    const inventory = await tx.inventory.findFirst({
      where: {
        productId,
        warehouseId,
      },
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    // 2️⃣ ATOMIC UPDATE (CRITICAL FIX)
    const updated = await tx.inventory.updateMany({
      where: {
        id: inventory.id,

        // ✅ ensures enough stock at DB level
        reservedStock: {
          lte: inventory.totalStock - quantity,
        },
      },
      data: {
        reservedStock: {
          increment: quantity,
        },
      },
    });

    // 3️⃣ If update failed → no stock
    if (updated.count === 0) {
      throw new Error("Not enough stock");
    }

    // 4️⃣ Create reservation
    const reservation = await tx.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    return reservation;
  });
}