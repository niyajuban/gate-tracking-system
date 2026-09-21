# Warehouse Gate Tracking System

An on-premises, containerized real-time gate inbound/outbound tracking platform designed for logistics and warehouse facilities. Enables operators at multiple warehouse gates (Gate A, Gate B) to log barcode scans, package photographs, and carrier metadata with immediate live supervisor dashboard synchronization over WebSockets.

---

## System Overview

The Warehouse Gate Tracking System is an edge-hosted local web application engineered for zero-latency, high-throughput warehouse gate operations using Zebra Android barcode scanner terminals and industrial mobile workstations.

### Key Capabilities

- **Fixed Gate Entry Portals:** Dedicated gate entry interfaces permanently bound by URL parameters (Gate A and Gate B), preventing operator misconfiguration.
- **Zebra Android Barcode Scanner Integration:** Custom-tuned for Zebra Enterprise mobile computers (TC21, TC26, TC5x series) using Zebra DataWedge keystroke injection for instant hands-free barcode capture.
- **Dual-Storage Architecture:**
  - **Structured Telemetry (PostgreSQL 16):** Persistent transactional records of scans, timestamps, gate IDs, carrier references, and operator IDs.
  - **Object Storage (MinIO S3-Compatible):** Local, high-performance object storage for high-resolution box condition photographs and shipping labels.
- **Live Supervisor Dashboard:** Real-time monitoring console displaying gate scan velocity, inbound vs. outbound traffic breakdown, and recent scan feeds with zero-refresh WebSocket pushes.
- **Containerized On-Premises Deployment:** Fully orchestrated via Docker Compose with an Nginx reverse proxy fronting all traffic on port 80.

---

## Zebra Scanner Integration and Workflow

The system is specifically architected to support industrial **Zebra Android Mobile Computers** (such as Zebra TC21, TC26, and TC52/TC57) operating on the warehouse local Wi-Fi network:

1. **Hardware Barcode Ingestion via Zebra DataWedge:**
   - Operators do not type tracking numbers. The integrated SE4710 1D/2D scan engine captures barcodes instantly.
   - Configured via a Zebra DataWedge profile to output barcode data as **keystroke injection** directly into the active browser input field, followed by an automatic Enter key or tab delimiter.
   - The scanning web form features auto-focus retention, ensuring the cursor remains in the barcode input field across successive scans.

2. **Package Condition and Proof-of-Delivery Photo Capture:**
   - Operators use the Zebra terminal integrated rear camera (13 MP) to take inspection photos of damaged cartons, seal tags, or Bills of Lading (BOL).
   - Images are compressed in-browser and uploaded directly via multipart form submission to the backend, which routes them into on-premises MinIO S3 object storage buckets.

3. **Zero-Error Kiosk Deployment:**
   - Each physical Zebra device is designated to a specific gate (e.g., Device 1 is assigned to Gate A; Device 2 to Gate B).
   - Devices run in restricted kiosk mode (or Chrome home-screen bookmark) locked to their assigned gate URL (`/entry?gate=A` or `/entry?gate=B`).
   - Gate selection is entirely automated and immutable in the URL parameter, eliminating human gate misassignment errors during peak shift operations.

---

## System Architecture

```mermaid
flowchart TD
    subgraph LAN [Warehouse Local Network / On-Premises LAN]
        subgraph Hardware [Zebra Mobile Terminals]
            ZebraA["Zebra TC21/TC26 (Gate A) - DataWedge Barcode Ingestion and Camera - Fixed: /entry?gate=A"]
            ZebraB["Zebra TC21/TC26 (Gate B) - DataWedge Barcode Ingestion and Camera - Fixed: /entry?gate=B"]
        end

        subgraph Ingress [Ingress and Routing]
            Nginx["Nginx Reverse Proxy (Port 80) - Static Asset Serving and WebSocket Upgrade"]
        end

        subgraph Containers [Containerized Core Services (Docker Compose)]
            Frontend["Next.js 16 Web Application - React 19, Tailwind CSS, Radix UI"]
            Backend["Node.js / Express API (Port 3001) - TypeScript, WebSocket Broadcaster, Multer"]
            Postgres[("PostgreSQL 16 Database - Transactional Scan Logs and Audit Trails")]
            MinIO[("MinIO S3 Object Storage - Package Condition and Label Photos")]
        end

        subgraph Operations [Supervision Console]
            Dashboard["Supervisor Live Dashboard (/dashboard) - Zero-Refresh Real-Time WebSocket Feed"]
        end
    end

    ZebraA -->|HTTP POST Scan and Photos| Nginx
    ZebraB -->|HTTP POST Scan and Photos| Nginx
    Nginx -->|Route / and static| Frontend
    Nginx -->|Route /api/* and /ws| Backend
    Backend -->|Write Scan Records| Postgres
    Backend -->|Store Uploaded Photos| MinIO
    Backend -.->|WebSocket Real-Time Broadcast| Dashboard
```

```text
+-------------------------------------------------------------------------+
|                              Warehouse LAN                              |
|                                                                         |
|   +--------------------------+          +---------------------------+   |
|   |   Gate A Zebra Scanner   |          |    Gate B Zebra Scanner   |   |
|   |  /entry?gate=A (Browser) |          |   /entry?gate=B (Browser) |   |
|   +------------+-------------+          +-------------+-------------+   |
|                |                                      |                 |
|                +------------------+-------------------+                 |
|                                   | HTTP POST (Scan + Photos)           |
|                                   v                                     |
|                       +-----------------------+                         |
|                       |   Nginx Reverse Proxy | (Port 80)               |
|                       +-----------+-----------+                         |
|                                   |                                     |
|         +-------------------------+-------------------------+           |
|         | /                                                 | /api, /ws |
|         v                                                   v           |
|   +-------------+                                   +----------------+  |
|   |   Frontend  |                                   |    Backend     |  |
|   |  (Next.js)  |                                   | (Node/Express) |  |
|   +------+------+                                   +-------+--------+  |
|          ^                                                  |           |
|          | WebSocket Broadcast (Live Feed Updates)          |           |
|          +--------------------------------------------------+           |
|                                                             |           |
|                                     +-----------------------+           |
|                                     |                       |           |
|                                     v                       v           |
|                              +--------------+        +---------------+  |
|                              |  PostgreSQL  |        |     MinIO     |  |
|                              | (DB Records) |        | (Photo S3)    |  |
|                              +--------------+        +---------------+  |
+-------------------------------------------------------------------------+
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Field Devices** | Zebra Android (TC21/TC26) | Barcode scanning via DataWedge and photo capture |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Radix UI, Lucide | Operator scanning UI and supervisor command center |
| **Backend** | Node.js, Express, TypeScript | REST API, validation middleware, and WebSocket broadcasting |
| **Database** | PostgreSQL 16 Alpine | ACID transactional storage for barcode scans and audit logs |
| **Object Storage** | MinIO | On-premises S3-compatible storage for package condition photos |
| **Realtime** | WebSocket (ws) | Sub-second push notifications of new scans to active dashboards |
| **Proxy** | Nginx Alpine | Single port 80 entrypoint, SSL termination, and routing |
| **Orchestration** | Docker Compose | Isolated multi-container deployment on local warehouse server |

---

## URL Structure

| URL Endpoint | Target User | Description |
| :--- | :--- | :--- |
| `http://<SERVER-IP>/entry?gate=A` | Gate A Operator (Zebra) | Dedicated inbound/outbound scan and photo submission portal for Gate A |
| `http://<SERVER-IP>/entry?gate=B` | Gate B Operator (Zebra) | Dedicated inbound/outbound scan and photo submission portal for Gate B |
| `http://<SERVER-IP>/dashboard` | Shift Supervisor | Live dashboard showing real-time scan events, velocity, and image reviews |

---

## Project Structure

```text
.
├── docker-compose.yml           # Multi-container orchestration definition
├── .gitignore                   # Repository ignore rules
├── frontend/                    # Next.js web application
│   ├── app/                     # Next.js App Router pages (entry, dashboard)
│   ├── components/              # Radix/Tailwind reusable UI components
│   ├── hooks/                   # Custom React hooks (WebSocket, mobile detection)
│   ├── lib/                     # API client, TypeScript definitions, mock fallback
│   ├── public/                  # Static brand assets and icons
│   ├── Dockerfile               # Production container build for Next.js
│   └── package.json
├── warehouse-backend/           # Express & TypeScript backend API
│   ├── src/
│   │   ├── db/                  # PostgreSQL pool and MinIO client initializers
│   │   ├── middleware/          # Multer memory-storage file upload pipeline
│   │   ├── routes/              # Scan creation, retrieval, and backup endpoints
│   │   ├── websocket/           # Broadcast server for live dashboard pushes
│   │   └── index.ts             # Service entry point and HTTP listener
│   ├── Dockerfile               # Production container build for backend
│   ├── tsconfig.json
│   └── package.json
└── warehouse-nginx/             # Reverse proxy configuration
    └── nginx.conf               # Upstream routing for frontend, API, and WebSockets
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on the host system
- Static IP address assigned to the host server on the warehouse local network
- Zebra scanner terminals connected to the same local subnet

### Running the Entire Stack

1. **Clone the repository:**
   ```bash
   git clone https://github.com/niyajuban/gate-tracking-system.git
   cd gate-tracking-system
   ```

2. **Configure Environment Variables (Optional):**
   The `docker-compose.yml` comes with default local credentials. Custom configurations can be specified in `warehouse-backend/.env`.

3. **Start all services:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify running containers:**
   ```bash
   docker compose ps
   ```
   All 5 services (`postgres`, `minio`, `backend`, `frontend`, and `nginx`) should report a healthy/running status.

5. **Access the System:**
   - **Gate A Zebra Terminal:** `http://<SERVER-IP>/entry?gate=A`
   - **Gate B Zebra Terminal:** `http://<SERVER-IP>/entry?gate=B`
   - **Supervisor Dashboard:** `http://<SERVER-IP>/dashboard`
   - **MinIO Object Console:** `http://<SERVER-IP>:9001` (Default: `minioadmin` / `minioadmin123`)

---

## License

This project is licensed under the ISC License.
