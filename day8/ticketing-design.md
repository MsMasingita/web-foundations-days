Set-Content -Path "day8/ticketing-design.md" -Value @'

# TicketHub - System Design Document

## 1. Requirements

### Functional Requirements

- Users can browse, search, and view details for available live events.
- Real-time seat maps indicate which seats are open, held, or purchased.
- Selected seats can be placed on a temporary 10-minute hold while checkout takes place.
- Completing payment confirms the order and issues digital tickets that users can access under their profile.

### Non-Functional Requirements

- Correctness and Zero Overbooking: No single seat can ever be sold or assigned to more than one customer.
- Scalability Under Spikes: The system must withstand short traffic surges reaching roughly 3,300 requests per second during major sales.
- Low Latency: Standard catalog pages and searches must return responses in under 1 second during typical load.
- Fair Allocation: A virtual waiting queue ensures users who arrive earlier get the first opportunity to pick seats and check out.

## 2. Estimates

- Regular Daily Operations: 50,000 daily visitors viewing roughly 10 pages each generates 500,000 daily page requests (~5 requests per second).
- Flash Sale Surge: 200,000 shoppers arriving across a 10-minute (600-second) window with ~10 interactions each yields ~2,000,000 total interactions, translating to roughly 3,300 requests per second.
- Capacity Realities: The venue offers strictly 20,000 seats. Consequently, a maximum of 20,000 transactions will succeed; the remaining ~180,000 concurrent shoppers must receive immediate out-of-stock feedback without overwhelming core backend databases.

## 3. API Design

- GET /events?search=&city=
  Returns a filtered collection of events (HTTP 200).

- GET /events/{id}
  Returns details, date, and venue metadata for a single event (HTTP 200).

- GET /events/{id}/seats
  Fetches current seating state (available, held, sold) for the venue chart (HTTP 200).

- POST /holds
  Request payload: { "eventId": 7, "seatIds": [101, 102] }
  Success: HTTP 201 Created returning hold identifier and 10-minute expiration timestamp.
  Conflict: HTTP 409 Conflict when one or more requested seats are already held or purchased.

- POST /orders
  Request payload: { "holdId": 55, "paymentToken": "..." }
  Success: HTTP 201 Created confirming the purchase and ticket issuance.

- GET /me/tickets
  Returns all verified tickets and admission passes belonging to the authenticated user (HTTP 200).

An HTTP 409 Conflict status indicates the requested resource state has changed because another customer secured the seat hold first.

## 4. Data Model

- users (id PK, name, email UNIQUE, password_hash)
- events (id PK, name, venue, starts_at)
- seats (id PK, event_id FK -> events, section, row, number, status ['available', 'held', 'sold'], hold_id, hold_expires_at, UNIQUE (event_id, section, row, number))
- orders (id PK, user_id FK -> users, event_id FK -> events, total, status, created_at)
- order_seats (order_id FK -> orders, seat_id FK -> seats UNIQUE)

Relationship Structure:

- Each event includes multiple seats (one-to-many).
- Each user can place multiple separate orders over time (one-to-many).
- Each order can bundle multiple seats, but any given physical seat can only ever appear once across all orders thanks to the unique constraint on order_seats.seat_id.

## 5. Preventing Double-Booking

To eliminate race conditions when multiple buyers click the same seat at once, the system uses an atomic conditional UPDATE executed directly within a database transaction:

    BEGIN TRANSACTION;
    UPDATE seats
    SET status = 'held',
        hold_id = 55,
        hold_expires_at = NOW() + INTERVAL '10 minutes'
    WHERE id IN (101, 102)
      AND event_id = 7
      AND (status = 'available' OR (status = 'held' AND hold_expires_at < NOW()));

    -- Evaluate affected row count:
    -- If rows updated < requested seats, another buyer completed the hold first:
    ROLLBACK; -- returns HTTP 409 Conflict
    -- Otherwise, lock succeeds:
    COMMIT;   -- returns HTTP 201 Created

Because the database engine checks availability and mutates status within a single atomic operation, concurrent attempts serialize at the row level; only the first attempt alters rows while the runner-up updates zero rows. The UNIQUE constraint on order_seats.seat_id acts as an immutable second layer preventing duplicate confirmed purchases. Expired holds automatically recycle back into availability since their hold_expires_at condition passes the WHERE filter.

## 6. Architecture

    [ User Client Browsers ]
               │
               ▼
    [ Content Delivery Network (CDN) ] ── (Static venue assets, event metadata)
               │
               ▼
    [ Load Balancer ]
               │
               ▼
    [ Virtual Waiting Room Queue ] ── (Regulates entry to ~2,000 active shoppers)
               │
               ▼
    [ Stateless App Server Cluster ] (Horizontally autoscaled)
         │                   │                     │
         ▼                   ▼                     ▼
    [ Redis Cache ]   [ Primary DB (PostgreSQL) ]  [ Payment Gateway ]
     - Event details   - Holds, seat states, orders  (Third-party charge processing)
     - Seat status map │
       (Short TTL)     ▼
                      [ Read Replicas ]
                       - Browsing, search queries
                       │
                       ▼
                      [ Message Queue (RabbitMQ / SQS) ]
                       │
                       ▼
                      [ Background Workers ]
                       - PDF generation, email dispatches

- CDN: Delivers static venue charts, images, and event pages directly from edge caches to eliminate repetitive server hits.
- Virtual Waiting Room: Holds the bulk of peak traffic in an orderly FIFO queue, admitting batches of buyers at a controlled throughput to shield the write database.
- Load Balancer & Autoscaling App Tier: Distributes web traffic evenly across stateless web workers that scale out automatically ahead of scheduled release events.
- Redis Cache: Holds cached copies of seat availability for 2 to 5 seconds to absorb hundreds of thousands of read refreshes without taxing disk storage.
- Primary Database: Exclusively handles transactional writes, seat holds, and confirmed sales under strict ACID consistency.
- Read Replicas: Relieve the primary engine by handling high-volume read traffic like event browsing and ticket verification.
- Async Worker Queue: Offloads non-critical post-payment steps (PDF rendering and confirmation emails) so user checkout finishes in milliseconds.

## 7. Trade-offs

1. Consistency over Availability for Seat Purchases: All hold operations and orders are strictly routed to the primary relational database. If heavy contention delays a query, returning an error or delay is preferable to eventual consistency, which could trigger catastrophic duplicate ticket sales.
2. Caching Latency vs. Read Performance: Caching seat maps with a short time-to-live (TTL) means buyers might occasionally click a seat that was taken seconds prior. The backend catches this instantly during the hold transaction and issues an HTTP 409 Conflict, a trade-off that successfully protects the primary database from crashing under 3,300 RPS.
3. Queue Overhead vs. Direct Access: Introducing a virtual waiting room adds architectural moving parts and obligates shoppers to wait in line, but it stops automated bots from hoarding inventory and prevents traffic spikes from bringing down the application.
   '@
