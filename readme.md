# Allo Inventory Reservation System

This project is my implementation of the Allo Health engineering take-home exercise. It is a small inventory and checkout reservation system for multi-warehouse ecommerce, built with Next.js App Router, TypeScript, Prisma, and hosted Postgres.

The main problem this app solves is the checkout race condition: when a customer reaches payment, stock should be held for a short time so another customer cannot buy the same physical unit. At the same time, stock should not be permanently reduced until payment actually succeeds.

## Features

- Product listing page with stock shown per warehouse.
- Temporary reservation flow before checkout/payment.
- Checkout page with live countdown.
- Confirm purchase flow for successful payment.
- Cancel flow for failed payment or user cancellation.
- Automatic release of expired pending reservations.
- Visible `409` error when stock is not available.
- Visible `410` error when a reservation has expired.
- Concurrency-safe reservation logic for the last unit of stock.

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL through Supabase
- React client components for the product and checkout screens
- Plain CSS for the UI

## Data Model

The app uses four main tables.

### Product

Stores the product being sold.

Important fields:

- `id`
- `name`

### Warehouse

Stores warehouse locations.

Important fields:

- `id`
- `name`

### Inventory

Stores stock for each product in each warehouse.

Important fields:

- `productId`
- `warehouseId`
- `totalStock`
- `reservedStock`

`totalStock` is the total number of units still owned by the warehouse.

`reservedStock` is the number of units currently held by pending reservations.

Available stock is calculated as:

```text
availableStock = totalStock - reservedStock
```

There is a unique constraint on `productId + warehouseId`, so each product has only one inventory row per warehouse.

### Reservation

Stores checkout holds.

Important fields:

- `productId`
- `warehouseId`
- `quantity`
- `status`
- `expiresAt`
- `createdAt`

Reservation status can be:

- `PENDING`: stock is temporarily held.
- `CONFIRMED`: payment succeeded and the sale is final.
- `RELEASED`: payment failed, user cancelled, or the reservation expired.

## API Routes

### `GET /api/products`

Returns all products with inventory grouped by warehouse. It also runs lazy cleanup for expired pending reservations before returning stock, so the product page does not show stale reserved stock.

### `GET /api/warehouses`

Returns the list of warehouses.

### `POST /api/reservations`

Creates a pending reservation for a product and warehouse.

Request body:

```json
{
  "productId": "product-id",
  "warehouseId": "warehouse-id",
  "quantity": 1
}
```

Responses:

- `200`: reservation created.
- `400`: missing or invalid input.
- `409`: not enough stock available.

### `GET /api/reservations/:id`

Returns reservation details for the checkout page, including product and warehouse names.

### `POST /api/reservations/:id/confirm`

Confirms the reservation after payment succeeds.

If the reservation is still pending:

- `reservedStock` is decreased.
- `totalStock` is decreased.
- reservation status becomes `CONFIRMED`.

If the reservation has expired, the API releases it and returns `410`.

### `POST /api/reservations/:id/release`

Releases the reservation early, usually because the user cancelled or payment failed.

If the reservation is still pending:

- `reservedStock` is decreased.
- `totalStock` stays the same.
- reservation status becomes `RELEASED`.

## How the Checkout Flow Works

### Reserve

When a customer clicks `Reserve`, the app tries to hold one unit from the selected warehouse. If available stock exists, a reservation is created for 10 minutes and the user is sent to the checkout page.

Example:

```text
Before reserve:
totalStock = 10
reservedStock = 0
availableStock = 10

After reserve:
totalStock = 10
reservedStock = 1
availableStock = 9
reservation = PENDING
```

### Confirm Purchase

Confirm means payment succeeded. The held stock becomes a real sale.

```text
Before confirm:
totalStock = 10
reservedStock = 1

After confirm:
totalStock = 9
reservedStock = 0
reservation = CONFIRMED
```

### Cancel

Cancel means payment failed or the user changed their mind. The held stock is returned to availability.

```text
Before cancel:
totalStock = 10
reservedStock = 1

After cancel:
totalStock = 10
reservedStock = 0
reservation = RELEASED
```

### Back to Products

The `Back to products` button only navigates back to the product listing. It does not cancel the reservation automatically. The reservation remains pending until the user confirms, cancels, or the 10 minute timer expires.

This is intentional because in a real checkout flow, leaving the page does not always mean payment has failed. The user may be returning from a payment redirect, refreshing, or opening checkout again.

### Expiry

Each reservation gets an `expiresAt` value 10 minutes after creation. If the user does not confirm before that time, the reservation should no longer block stock.

If the user clicks confirm after expiry, the API returns:

```text
410 Reservation expired
```

and the reservation is released.

## Concurrency Safety

This is the most important part of the exercise.

The dangerous case is when two customers try to reserve the last available unit at the same time. A simple read-then-write approach can fail:

```text
Request A reads availableStock = 1
Request B reads availableStock = 1
Both create reservations
Now two customers think they own the same unit
```

To avoid that, the app uses a single conditional database update inside a transaction:

```sql
UPDATE "Inventory"
SET "reservedStock" = "reservedStock" + quantity
WHERE "productId" = productId
  AND "warehouseId" = warehouseId
  AND ("totalStock" - "reservedStock") >= quantity
RETURNING "id"
```

The important part is this condition:

```sql
("totalStock" - "reservedStock") >= quantity
```

Postgres applies the update atomically on the inventory row. If two requests arrive at the same time for the final unit, only one update can succeed. The other request no longer satisfies the stock condition and receives `409`.

I tested this with two simultaneous reservation requests for a product that had only one available unit. The result was:

```text
200, 409
```

That is the expected behavior.

## Expiry Cleanup Approach

For this implementation, I used lazy cleanup.

Expired pending reservations are released when:

- products are fetched, or
- a new reservation is created, or
- an expired reservation is confirmed.

The cleanup updates inventory and reservation state so expired holds stop blocking available stock.

For production, I would add a scheduled job as well, for example a Vercel Cron job that runs every minute and calls an internal cleanup endpoint. I would still keep lazy cleanup as a safety net, because scheduled jobs can be delayed or fail temporarily.

## Running Locally

Create a `.env` file:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=no-verify"
```

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

Seed the database:

```bash
npx prisma db seed
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd run dev
```

## Deploying to Vercel

Add `DATABASE_URL` in Vercel under Project Settings -> Environment Variables.

For Supabase, use the pooled connection string from `Project Settings -> Database -> Connection string -> Transaction pooler`. The direct database host can fail on Vercel because serverless functions may not have IPv6 database access. Make sure the value uses TLS without local certificate-chain verification, for example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?sslmode=no-verify"
```

After changing the environment variable, redeploy the project.

## Checking the Database

The easiest way to inspect local data is Prisma Studio:

```bash
npx prisma studio
```

Open:

```text
http://localhost:5555
```

In Supabase, open the project dashboard and go to `Table Editor`. Check these tables:

- `Product`
- `Warehouse`
- `Inventory`
- `Reservation`

Expected behavior:

- After clicking `Reserve`, a `Reservation` row appears with `PENDING`.
- `Inventory.reservedStock` increases.
- After clicking `Cancel`, reservation becomes `RELEASED` and `reservedStock` decreases.
- After clicking `Confirm purchase`, reservation becomes `CONFIRMED`, `reservedStock` decreases, and `totalStock` decreases.

## Testing Notes

I verified:

- Production build passes with `npm run build`.
- Prisma schema validates with `npx prisma validate`.
- Product API returns data from Supabase.
- Reservation creation works.
- Release/cancel works.
- Concurrency test returns one success and one `409` for the last unit.

## Trade-offs

Idempotency is not implemented yet. The exercise lists it as a bonus. If I had more time, I would add an `IdempotencyKey` table and store the original response for reserve and confirm requests. That would make client retries safer during network failures.

The UI is intentionally simple. I focused more time on the correctness of the reservation flow and the database behavior because that is the core of the exercise.

The expiry mechanism uses lazy cleanup instead of a dedicated background worker. For a production deployment, I would add Vercel Cron or a small worker process to release expired reservations regularly.

There is no authentication in this demo. In a real system, reservations would be tied to a user, cart, checkout session, or order attempt.

## Submission Checklist

- Source code pushed to a public GitHub repository.
- Hosted Postgres database configured.
- Database seeded with demo products and warehouses.
- App deployed to Vercel.
- `DATABASE_URL` added in Vercel environment variables.
- Live URL tested end to end.

## Final Notes

The main thing I wanted to get right was the stock transition:

```text
available -> reserved -> confirmed
available -> reserved -> released
available -> reserved -> expired -> released
```

The implementation keeps `totalStock` and `reservedStock` separate so abandoned checkouts do not permanently reduce inventory, while confirmed purchases still reduce stock correctly.
