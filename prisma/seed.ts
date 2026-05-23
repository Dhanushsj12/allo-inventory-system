import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // PRODUCTS
  const product1 = await prisma.product.create({
    data: { name: "T-Shirt" },
  });

  const product2 = await prisma.product.create({
    data: { name: "Running Shoes" },
  });

  const product3 = await prisma.product.create({
    data: { name: "Backpack" },
  });

  const product4 = await prisma.product.create({
    data: { name: "Wireless Headphones" },
  });

  // WAREHOUSES
  const warehouse1 = await prisma.warehouse.create({
    data: { name: "Chennai Warehouse" },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: { name: "Bangalore Warehouse" },
  });

  const warehouse3 = await prisma.warehouse.create({
    data: { name: "Mumbai Warehouse" },
  });

  // INVENTORY
  await prisma.inventory.createMany({
    data: [
      {
        productId: product1.id,
        warehouseId: warehouse1.id,
        totalStock: 50,
      },
      {
        productId: product1.id,
        warehouseId: warehouse2.id,
        totalStock: 30,
      },
      {
        productId: product2.id,
        warehouseId: warehouse1.id,
        totalStock: 20,
      },
      {
        productId: product3.id,
        warehouseId: warehouse3.id,
        totalStock: 15,
      },
      {
        productId: product4.id,
        warehouseId: warehouse2.id,
        totalStock: 40,
      },
    ],
  });

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


console.log(await prisma.product.findMany());
console.log(await prisma.warehouse.findMany());