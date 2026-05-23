"use client";

export default function TestPage() {

  const testReservation = async () => {
    const res = await fetch("http://localhost:3001/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: "c5d1e411-8f79-47cb-94b5-7bc6be60514b",
        warehouseId: "e102b18d-f70e-41f0-8488-bcbc7f3ed1e3",
        quantity: 1,
      }),
    });

    const data = await res.json();
    console.log(data);
    alert(JSON.stringify(data));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Reservation</h1>
      <button onClick={testReservation}>
        Create Reservation
      </button>
    </div>
  );
}