import { prisma } from "../prisma";

export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number
) {
  return await prisma.$transaction(async (tx) => {

    const inventory = await tx.inventory.findFirst({
      where: {
        productId,
        warehouseId,
      },
    });

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    const available = inventory.totalStock - inventory.reservedStock;

    if (available < quantity) {
      throw new Error("Not enough stock");
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedStock: inventory.reservedStock + quantity,
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

    return reservation;
  });
}