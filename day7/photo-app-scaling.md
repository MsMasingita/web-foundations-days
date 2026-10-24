# SnapShare - System Scaling Plan

## 1. Assumptions & Daily Active Users (DAU)

- Total registered users: 10,000,000 (10 million)
- Daily active users rate: 10%
- Daily Active Users (DAU): 10,000,000 × 0.10 = 1,000,000 (1 million DAU)
- Daily uploads per active user: 1 photo/day
- Daily feed views per active user: 50 views/day
- Average photo size: 2 MB
- Average thumbnail size: 50 KB (0.05 MB)
- Total storage per uploaded photo (original + thumbnail): 2.05 MB
- Seconds in a day: 24 × 60 × 60 = 86,400 seconds

---

## 2. Capacity Estimates & Traffic Calculations

### A. Uploads Per Second (Writes)

- Total uploads per day: 1,000,000 photos/day
- Average uploads per second: 1,000,000 / 86,400 ≈ 11.57 uploads/sec (~12 uploads/sec)
- Peak uploads per second (5× multiplier): 11.57 × 5 ≈ 57.87 uploads/sec (~58 uploads/sec)

### B. Feed Views Per Second (Reads)

- Total feed views per day: 1,000,000 × 50 = 50,000,000 feed page views/day
- Average feed views per second: 50,000,000 / 86,400 ≈ 578.70 views/sec (~579 views/sec)
- Peak feed views per second (5× multiplier): 578.70 × 5 ≈ 2,893.50 views/sec (~2,894 views/sec)

### C. Photo Storage Per Year

- Daily data generated: 1,000,000 photos × 2.05 MB = 2,050,000 MB/day = 2,050 GB/day ≈ 2.05 TB/day
- Annual photo storage: 2.05 TB/day × 365 days ≈ 748.25 TB/year (~0.75 PB/year)

---

## 3. Workload Characterization: Read-Heavy vs. Write-Heavy

SnapShare is heavily **read-heavy**.

With 50 million feed reads per day compared to 1 million uploads per day, the read-to-write ratio is **50:1**. This dominant read ratio requires an architecture optimized for low-latency content delivery. The design must minimize direct queries to the primary database by caching user feeds and profile data in memory (e.g., Redis) and distributing static assets (photos and thumbnails) across a globally distributed Content Delivery Network (CDN).

---

## 4. Media Storage Strategy

Photos and binary media files must **never** be stored directly inside a relational database (such as raw BLOBs) because:

- Bloating the database engine with large binaries exhausts database memory, degrades query performance, and makes index lookups slow.
- Backups, snapshots, and database replications become excessively slow, costly, and resource-heavy.
- Database throughput should be reserved for fast transactional queries, relational indexing, and metadata operations.

**Where they should go instead:**
Photo binaries belong in **Object Storage** (e.g., AWS S3, Google Cloud Storage, or MinIO). Object storage is horizontally scalable, highly durable, cost-effective for large static files, and integrates natively with CDNs. The database should only store the metadata (such as photo ID, user ID, timestamp) and a string URL linking to the object storage location.

---

## 5. System Architecture Diagram

```text
[ Client Device (Web / Mobile) ]
             |
             +------------------------------+
             |                              |
             v                              v
      [ CDN Edge Cache ]         [ Load Balancer (Nginx/ALB) ]
    (Static Photos & Thumbs)                |
             |                              v
             |                    [ App Server Cluster ]
             |                     (Node.js / Express)
             |                        |      |      |
             |       +----------------+      |      +----------------+
             |       |                       v                       |
             |       |             [ Cache Layer (Redis) ]           |
             |       |            (Feeds & User Metadata)            |
             |       v                                               v
             | [ Message Queue ]                            [ Relational DB ]
             |   (RabbitMQ/SQS)                              (Primary - Writes)
             |       |                                               |
             |       v                                               v
             | [ Background Worker ]                        [ Read Replica DB ]
             |  (Generates 50KB Thumbs)                      (Read queries only)
             |       |
             +------>+
                     |
                     v
           [ Object Storage ]
            (Originals & Thumbs)
```
