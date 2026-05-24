"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Reservation = {
  id: string;
  quantity: number;
  status: string;
  expiresAt: string;
  product: { name: string };
  warehouse: { name: string };
};

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function readJson(res: Response) {
    const text = await res.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }

  async function loadReservation() {
    setMessage("");
    const res = await fetch(`/api/reservations/${id}`, { cache: "no-store" });
    const data = await readJson(res);

    if (!res.ok) {
      setMessage(data?.error || "Could not load reservation.");
      return;
    }

    setReservation(data);
  }

  useEffect(() => {
    if (id) {
      loadReservation();
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - now) / 1000));
  }, [reservation, now]);

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const isPending = reservation?.status === "PENDING";
  const isExpired = isPending && secondsLeft <= 0;

  async function act(action: "confirm" | "release") {
    setBusy(action);
    setMessage("");

    try {
      const res = await fetch(`/api/reservations/${id}/${action}`, {
        method: "POST",
      });
      const data = await readJson(res);

      if (!res.ok) {
        setMessage(data?.error || "Action failed.");
        await loadReservation();
        return;
      }

      setReservation(data);
      setMessage(action === "confirm" ? "Purchase confirmed." : "Reservation cancelled.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="checkoutShell">
      <Link href="/" className="backLink">
        Back to products
      </Link>

      <section className="checkoutPanel">
        <p className="eyebrow">Checkout</p>
        <h1>{reservation?.product.name || "Reservation"}</h1>

        {!reservation && !message && <p className="muted">Loading reservation...</p>}
        {message && <p className={message.includes("expired") ? "error" : "success"}>{message}</p>}

        {reservation && (
          <>
            <dl className="details">
              <div>
                <dt>Warehouse</dt>
                <dd>{reservation.warehouse.name}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{reservation.quantity}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{reservation.status}</dd>
              </div>
              <div>
                <dt>Time left</dt>
                <dd>{isPending ? countdown : "Closed"}</dd>
              </div>
            </dl>

            {isExpired && <p className="error">Reservation expired. Confirming will return 410.</p>}

            <div className="actions">
              <button
                onClick={() => act("confirm")}
                disabled={!isPending || busy === "confirm"}
              >
                {busy === "confirm" ? "Confirming..." : "Confirm purchase"}
              </button>
              <button
                className="secondary"
                onClick={() => act("release")}
                disabled={!isPending || busy === "release"}
              >
                {busy === "release" ? "Cancelling..." : "Cancel"}
              </button>
              <button className="secondary" onClick={() => router.push("/")}>
                View stock
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
