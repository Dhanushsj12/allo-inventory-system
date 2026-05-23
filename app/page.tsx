"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const router = useRouter();

  // 🔥 FETCH PRODUCTS (AUTO REFRESH)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 RESERVE FUNCTION
  const handleReserve = async (productId: string, warehouseId: string) => {
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();

      // ✅ redirect to checkout
      router.push(`/checkout/${data.id}`);

    } catch (err) {
      console.error(err);
      alert("Reservation failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Allo Inventory
      </h1>

      <div className="space-y-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-md p-6"
          >
            {/* 🔥 PRODUCT TITLE */}
            <h2 className="text-xl font-semibold">
              {product.name}
            </h2>

            {/* 🔥 ADDED LINE (YOU WANTED THIS) */}
            <p className="text-sm text-gray-500 mb-4">
              Real-time inventory with reservation system
            </p>

            {/* 🔥 INVENTORY LIST */}
            <div className="space-y-4">
              {product.inventories.map((inv: any, index: number) => {
                const available =
                  inv.totalStock - inv.reservedStock;

                return (
                  <div
                    key={inv.id}
                    className="flex justify-between items-center border-t pt-4"
                  >
                    {/* LEFT SIDE */}
                    <div>
                      <p className="text-sm font-medium">
                        Warehouse {index + 1}
                      </p>

                      <p className="text-sm">
                        Stock:{" "}
                        <span
                          className={
                            available > 0
                              ? "text-green-600 font-semibold"
                              : "text-red-500 font-semibold"
                          }
                        >
                          {available}
                        </span>
                      </p>
                    </div>

                    {/* RIGHT SIDE BUTTON */}
                    <button
                      disabled={available <= 0}
                      onClick={() =>
                        handleReserve(product.id, inv.warehouseId)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        available > 0
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {available > 0
                        ? "Reserve"
                        : "Out of stock"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}