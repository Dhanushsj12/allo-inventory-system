import { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function releaseExpiredReservations(tx: TxClient) {
  await tx.$executeRaw`
    UPDATE "Inventory" inventory
    SET "reservedStock" = GREATEST(0, inventory."reservedStock" - expired.quantity)
    FROM (
      SELECT "productId", "warehouseId", SUM("quantity")::int AS quantity
      FROM "Reservation"
      WHERE "status" = 'PENDING'
        AND "expiresAt" <= NOW()
      GROUP BY "productId", "warehouseId"
    ) expired
    WHERE inventory."productId" = expired."productId"
      AND inventory."warehouseId" = expired."warehouseId"
  `;

  await tx.reservation.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "RELEASED" },
  });
}
