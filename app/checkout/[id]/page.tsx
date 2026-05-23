"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();

  const [reservation, setReservation] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // 🔥 FETCH RESERVATION
  const fetchReservation = async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);

      if (!res.ok) {
        console.error("Failed to fetch reservation");
        return;
      }

      const data = await res.json();
      setReservation(data);

      if (data.status === "PENDING") {
        const expiry = new Date(data.expiresAt).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchReservation();
  }, [id]);

  // 🔥 TIMER
  useEffect(() => {
    if (!timeLeft || reservation?.status !== "PENDING") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchReservation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, reservation]);

  if (!reservation) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        <p><b>ID:</b> {reservation.id}</p>
        <p><b>Status:</b> {reservation.status}</p>

        {reservation.status === "PENDING" && (
          <p><b>Expires in:</b> {timeLeft}s</p>
        )}

        {/* MESSAGE */}
        {reservation.status !== "PENDING" && (
          <p className="mt-4 text-center text-sm text-gray-500">
            This reservation is already completed.
          </p>
        )}

        {/* BUTTONS */}
        {reservation.status === "PENDING" && (
          <div className="mt-6 flex gap-3">

            {/* CONFIRM */}
            <button
              onClick={async () => {
                const res = await fetch(`/api/reservations/${id}/confirm`, {
                  method: "POST",
                });

                const data = await res.json();

                if (!res.ok) {
                  alert(data.error);
                  return;
                }

                setReservation(data);
              }}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            >
              Confirm
            </button>

            {/* CANCEL */}
            <button
              onClick={async () => {
                const res = await fetch(`/api/reservations/${id}/release`, {
                  method: "POST",
                });

                const data = await res.json();

                if (!res.ok) {
                  alert(data.error);
                  return;
                }

                setReservation(data);
                await fetchReservation(); // refresh
              }}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
            >
              Cancel
            </button>

          </div>
        )}

        {/* 🔥 BACK BUTTON (FINAL FIX) */}
        <div className="mt-6">
          <button
            onClick={async () => {
              // 🔥 AUTO RELEASE BEFORE LEAVING
              if (reservation?.status === "PENDING") {
                await fetch(`/api/reservations/${id}/release`, {
                  method: "POST",
                });
              }

              router.push("/");
            }}
            className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900"
          >
            Back to Products
          </button>
        </div>

      </div>
    </div>
  );
}