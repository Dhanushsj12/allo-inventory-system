"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
};

type Product = {
  id: string;
  name: string;
  warehouses: WarehouseStock[];
};

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reservingKey, setReservingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load products.");
      }

      setProducts(data);
      setSelectedWarehouses((current) => {
        const next = { ...current };
        for (const product of data) {
          if (!next[product.id] && product.warehouses[0]) {
            next[product.id] = product.warehouses[0].warehouseId;
          }
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function reserve(productId: string) {
    const warehouseId = selectedWarehouses[productId];

    if (!warehouseId) {
      setError("Choose a warehouse first.");
      return;
    }

    setReservingKey(`${productId}:${warehouseId}`);
    setError("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reservation failed.");
      }

      router.push(`/checkout/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Reservation failed.");
      await loadProducts();
    } finally {
      setReservingKey(null);
    }
  }

  const totalAvailable = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum + product.warehouses.reduce((inner, stock) => inner + stock.availableStock, 0),
        0
      ),
    [products]
  );

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Allo Inventory</p>
          <h1>Checkout reservations</h1>
        </div>
        <button className="secondary" onClick={loadProducts} disabled={loading}>
          Refresh
        </button>
      </section>

      <section className="summary">
        <div>
          <span>Products</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span>Available units</span>
          <strong>{totalAvailable}</strong>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading inventory...</p>}

      <section className="productGrid">
        {products.map((product) => {
          const selectedWarehouseId = selectedWarehouses[product.id];
          const selectedStock = product.warehouses.find(
            (stock) => stock.warehouseId === selectedWarehouseId
          );
          const isReserving = reservingKey === `${product.id}:${selectedWarehouseId}`;

          return (
            <article className="productCard" key={product.id}>
              <div className="productHeader">
                <h2>{product.name}</h2>
                <span>{selectedStock?.availableStock ?? 0} available</span>
              </div>

              <label>
                Warehouse
                <select
                  value={selectedWarehouseId || ""}
                  onChange={(event) =>
                    setSelectedWarehouses((current) => ({
                      ...current,
                      [product.id]: event.target.value,
                    }))
                  }
                >
                  {product.warehouses.map((stock) => (
                    <option key={stock.warehouseId} value={stock.warehouseId}>
                      {stock.warehouseName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="stockRows">
                {product.warehouses.map((stock) => (
                  <div key={stock.warehouseId}>
                    <span>{stock.warehouseName}</span>
                    <strong>
                      {stock.availableStock}/{stock.totalStock}
                    </strong>
                  </div>
                ))}
              </div>

              <button
                onClick={() => reserve(product.id)}
                disabled={!selectedStock || selectedStock.availableStock < 1 || isReserving}
              >
                {isReserving ? "Reserving..." : "Reserve"}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
