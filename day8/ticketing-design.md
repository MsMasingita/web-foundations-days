# TicketHub System Design Document

## 1. Requirements

### Functional Requirements

- Event Discovery: Users can browse, search, and filter upcoming concerts and events by date, venue, and genre[cite: 1, 2].
- Seat Map & Availability: Users can view a live seating chart for a chosen event showing real-time seat states: available, held, or booked[cite: 1].
- Seat Reservation (Hold): A user can select an available seat and temporarily hold it for 10 minutes while completing checkout[cite: 1].
- Payment & Order Finalization: Users can submit payment for held seats before the hold expires to confirm the purchase[cite: 1].
- Ticket Issuance: Once payment succeeds, the system generates an order and provides tickets with verifiable identifiers or QR codes[cite: 1].

### Non-Functional Requirements

- Speed (Low Latency): Read operations (browsing events, viewing seat maps) must respond in under 100 ms under normal load and under 300 ms during traffic spikes[cite: 1].
- Correctness (Zero Overbooking): Strict consistency must be guaranteed; under no circumstances may two customers purchase the same seat[cite: 1, 2].
- Fairness: Seats are allocated on a first-come, first-served basis[cite: 1]. The system must prevent bot hoarding using rate limits and enforce a 10-minute maximum reservation lock[cite: 1].
- Availability: Target 99.99% uptime for browsing, with graceful error handling so high write volume never crashes the read pipeline[cite: 1].

---

## 2. Traffic & Capacity Estimations

### Given Data Points

- 2,000,000 registered users across the platform[cite: 1, 2].
- Normal Day: 50,000 daily visitors viewing an average of 10 pages each, resulting in 5,000 tickets sold per day[cite: 1, 2].
- Big Sale Peak: 200,000 active users attempt to purchase 20,000 seats within a 10-minute window[cite: 1, 2].

### Normal Day Calculations

- Total Daily Page Views: 50,000 \* 10 = 500,000 page views/day[cite: 1, 2].
- Average Read Throughput: 500,000 / 86,400 = approximately 5.8 requests per second (RPS).
- Peak Normal Read Throughput (assuming 80% of activity happens within an 8-hour window): 400,000 / 28,800 = approximately 13.9 RPS.
- Write Throughput (Purchases): 5,000 / 86,400 = approximately 0.058 purchases per second[cite: 1, 2].

### "Big Sale" Peak Calculations (10-Minute Window = 600 Seconds)

- Write Throughput (Reservation / Hold Requests): 200,000 users attempt to reserve seats over 600 seconds, which equals 200,000 / 600 = approximately 333.3 write requests per second[cite: 1, 2]. Instantaneous bursts at opening second can spike above 5,000 writes/sec without queue throttling.
- Read Throughput (Polling / Refreshing): Assuming each user refreshes the seat map or polls status every 3 seconds: 200,000 / 3 = approximately 66,667 read RPS.

### Comparison: Normal Day vs. Big Sale

- Read Traffic: Jumps from roughly 14 RPS to 66,667 RPS—an increase of more than 4,700 times normal peak load.
- Write Traffic: Jumps from <0.1 transactions/sec to roughly 333 transactions/sec, all competing for the exact same database records (20,000 seats for one event)[cite: 1, 2].
- Key Takeaway: A standard relational database cannot handle 66,000+ reads per second directly. We must use an edge CDN for static content, Redis caching for seat availability, and a virtual queue to buffer incoming reservation attempts.

---

## 3. API Design

### 1. Browse Events

- Method & Endpoint: GET /api/v1/events[cite: 1]
- Description: Retrieves a paginated list of upcoming concerts and shows with filter parameters[cite: 1, 2].
- Query Parameters: page (default 1), limit (default 20), search (keyword)
- Response (200 OK):
  {
  "events": [
  {
  "id": "evt_101",
  "title": "Acoustic Tour 2026",
  "venue": "National Stadium",
  "event_date": "2026-11-20T19:00:00Z",
  "total_seats": 20000,
  "available_seats": 15420
  }
  ],
  "page": 1,
  "total": 1
  }

### 2. View Seats for an Event

- Method & Endpoint: GET /api/v1/events/:id/seats[cite: 1]
- Description: Retrieves real-time seating availability for a specific venue and event[cite: 1].
- Response (200 OK):
  {
  "event_id": "evt_101",
  "seats": [
  {
  "seat_id": "seat_a10",
  "section": "Stalls-Front",
  "row": "A",
  "number": 10,
  "price_cents": 12000,
  "status": "AVAILABLE"
  }
  ]
  }

### 3. Hold a Seat (Temporary Reservation)

- Method & Endpoint: POST /api/v1/seats/hold[cite: 1]
- Description: Temporarily reserves a selected seat for 10 minutes so the customer can check out[cite: 1].
- Request Body:
  {
  "event_id": "evt_101",
  "seat_id": "seat_a10"
  }
- Response (200 OK - Seat Held):
  {
  "reservation_id": "res_8842",
  "seat_id": "seat_a10",
  "status": "HELD",
  "expires_at": "2026-10-25T14:33:00Z"
  }
- Response (409 Conflict - Seat Taken):
  {
  "error": "SEAT_UNAVAILABLE",
  "message": "This seat has already been selected or booked by someone else."
  }

### 4. Pay and Confirm Order

- Method & Endpoint: POST /api/v1/orders/checkout[cite: 1]
- Description: Validates payment token, clears the hold lock, and confirms seat purchase[cite: 1].
- Request Body:
  {
  "reservation_id": "res_8842",
  "payment_method_id": "pm_card_visa_4242"
  }
- Response (201 Created):
  {
  "order_id": "ord_9901",
  "seat_id": "seat_a10",
  "status": "CONFIRMED",
  "amount_paid_cents": 12000,
  "transaction_id": "txn_65412"
  }

### 5. View Purchased Tickets

- Method & Endpoint: GET /api/v1/users/:id/tickets[cite: 1]
- Description: Retrieves all confirmed tickets and verifiable passes issued to the user[cite: 1].
- Response (200 OK):
  {
  "tickets": [
  {
  "ticket_id": "tkt_5021",
  "order_id": "ord_9901",
  "event_title": "Acoustic Tour 2026",
  "section": "Stalls-Front",
  "row": "A",
  "seat_number": 10,
  "qr_code_token": "qr_valid_882049"
  }
  ]
  }

---

## 4. Data Model (Database Schema & Relationships)

### Schema Definitions (SQL)

-- 1. Users Table
CREATE TABLE users (
id VARCHAR(36) PRIMARY KEY,
email VARCHAR(255) UNIQUE NOT NULL,
full_name VARCHAR(120) NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Events Table
CREATE TABLE events (
id VARCHAR(36) PRIMARY KEY,
title VARCHAR(200) NOT NULL,
venue VARCHAR(200) NOT NULL,
start_time TIMESTAMP WITH TIME ZONE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seats Table
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'HELD', 'BOOKED');

CREATE TABLE seats (
id VARCHAR(36) PRIMARY KEY,
event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
section VARCHAR(50) NOT NULL,
row_num VARCHAR(10) NOT NULL,
seat_num VARCHAR(10) NOT NULL,
price_cents INTEGER NOT NULL,
status seat_status NOT NULL DEFAULT 'AVAILABLE',
held_by_user_id VARCHAR(36) REFERENCES users(id),
hold_expires_at TIMESTAMP WITH TIME ZONE,
version INTEGER NOT NULL DEFAULT 0,
CONSTRAINT unique_seat_per_event UNIQUE (event_id, section, row_num, seat_num)
);

CREATE INDEX idx_seats_event_status ON seats(event_id, status);

-- 4. Orders Table
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

CREATE TABLE orders (
id VARCHAR(36) PRIMARY KEY,
user_id VARCHAR(36) NOT NULL REFERENCES users(id),
event_id VARCHAR(36) NOT NULL REFERENCES events(id),
seat_id VARCHAR(36) NOT NULL REFERENCES seats(id),
amount_cents INTEGER NOT NULL,
status order_status NOT NULL DEFAULT 'PENDING',
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT unique_order_per_seat UNIQUE (seat_id)
);

### Table Relationships & Integrity

- Users to Orders (1 : N): One user can make multiple purchases over time.
- Events to Seats (1 : N): One event contains many individual seat records.
- Events to Orders (1 : N): An event gathers many completed orders.
- Seats to Orders (1 : 1): Each seat maps strictly to one confirmed order row via unique_order_per_seat, guaranteeing double-booking cannot persist at the database level[cite: 1, 2].

---

## 5. Double-Booking Prevention (Transactions & Constraints)

Double-booking happens when two buyers view an available seat at the same time and attempt to purchase it simultaneously[cite: 1]. The system uses a multi-layered approach to guarantee that no seat is sold twice[cite: 1, 2]:

### 1. Database-Level Unique Constraints

The schema enforces hard invariants directly at the database engine level:

- In the seats table, CONSTRAINT unique_seat_per_event UNIQUE (event_id, section, row_num, seat_num) ensures no physical seat can be created twice.
- In the orders table, CONSTRAINT unique_order_per_seat UNIQUE (seat_id) guarantees that even under race conditions, the database engine rejects duplicate purchases for the same seat.

### 2. Atomic Conditional Updates (Optimistic Locking)

Rather than locking the whole table, the application uses an atomic conditional UPDATE query when a user attempts to hold a seat:

UPDATE seats
SET status = 'HELD',
held_by_user_id = :user_id,
hold_expires_at = NOW() + INTERVAL '10 minutes',
version = version + 1
WHERE id = :seat_id
AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < NOW()))
AND version = :current_version;

- If two users attempt to reserve the same seat concurrently, the database serializes row-level locks.
- The first transaction succeeds and increments the version.
- The second transaction finds that version no longer matches (or status is no longer 'AVAILABLE'), updating 0 rows. The application detects this and immediately returns an HTTP 409 Conflict error.

### 3. ACID Transactions for Payment and Final Order

When payment is submitted, the checkout process executes within an atomic database transaction with READ COMMITTED or SERIALIZABLE isolation:

BEGIN TRANSACTION;

-- 1. Ensure the user holding the seat is the one paying, and hold has not expired
SELECT id FROM seats
WHERE id = :seat_id
AND held_by_user_id = :user_id
AND hold_expires_at > NOW()
FOR UPDATE;

-- 2. Mark seat as permanently booked
UPDATE seats
SET status = 'BOOKED',
held_by_user_id = NULL,
hold_expires_at = NULL,
version = version + 1
WHERE id = :seat_id;

-- 3. Create the confirmed order
INSERT INTO orders (id, user_id, event_id, seat_id, amount_cents, status)
VALUES (:order_id, :user_id, :event_id, :seat_id, :amount_cents, 'CONFIRMED');

COMMIT;

If the hold expired or payment failed, the entire transaction is rolled back, preventing orphaned charges or unassigned tickets.

---

## 6. Architecture & Peak Sale Survival

### Architecture Diagram

[ 200,000 Users / Mobile & Web Browsers ]
|
v
[ Cloudflare CDN ] <-- Caches static assets & event details
|
v
[ Virtual Waiting Room / Queue ] <-- Throttles ingress to 500 req/sec
|
v
[ Application Load Balancers ]
|
+-----------+-----------+
| |
v v
[ App Server 1 ] [ App Server 2 ] ... [ App Server N ] (Autoscaling)
| |
+-----------------------+-----------------------+
| |
v v
[ Redis In-Memory Cluster ] [ PostgreSQL Primary ]

- Fast hold locks (SET NX EX) - Row-level ACID transactions
- Cached seat availability map - Final order placement
- Queue token validation |
  v
  [ PostgreSQL Replicas ] - Read-only queries (user tickets)

### How the Architecture Survives the Big Sale

1. Edge Caching via CDN:
   The Content Delivery Network caches static frontend assets and immutable event metadata at edge locations. This absorbs over 90% of general page browsing without those requests ever reaching the core backend servers.

2. Virtual Waiting Room (Traffic Throttling):
   Instead of letting all 200,000 concurrent users hit the reservation database directly, incoming traffic is routed into a FIFO queue. The queue admits users in controlled batches (e.g., 500 users per second), protecting downstream services from collapsing.

3. In-Memory Locks with Redis:
   When a user clicks to hold a seat, the application attempts an atomic lock operation in Redis using SET lock:seat:{seat_id} {user_id} NX EX 600. Because Redis operates in memory with sub-millisecond latencies, it can handle tens of thousands of lock acquisition attempts per second, instantly rejecting duplicate attempts before they touch the relational database.

4. Horizontally Scaled Application Cluster:
   Stateless application instances scale out automatically behind the load balancer based on CPU utilization and request queues, ensuring computing capacity dynamically matches user volume.

5. Read/Write Splitting on the Database:
   The primary PostgreSQL instance is dedicated exclusively to processing write transactions (seat holds, state transitions, and confirmed orders). Read queries (such as checking order history or browsing seat maps) are served by read replicas and cached Redis keys.

---

## 7. Architectural Trade-offs

1. In-Memory Distributed Locking (Redis) vs. Pure Relational Database Locking (SELECT ... FOR UPDATE)
   - Chosen Approach: We place an in-memory Redis lock in front of the primary relational database to intercept rapid reservation attempts.
   - Trade-off: This introduces additional architectural complexity and requires keeping the cache and the database synchronized. However, relying solely on pessimistic row locks (FOR UPDATE) in PostgreSQL under a 200,000-user spike would saturate the database connection pool, cause widespread transaction deadlocks, and take down the entire system[cite: 1, 2].

2. Virtual Waiting Room (Queuing) vs. Immediate Direct Access
   - Chosen Approach: Users are held in a virtual queue and released into the seat checkout funnel in calibrated batches (e.g., 500 users per second).
   - Trade-off: Users do not get instant real-time checkout access and must wait a few minutes in a queue, which can add minor friction to the user experience. However, this trade-off is necessary to protect the application from cascading failures, crash prevention, and automated bot scraping.
