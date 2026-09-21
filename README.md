# Warehouse Gate Tracking System

An on-premises, containerized real-time gate inbound/outbound tracking platform designed for logistics and warehouse facilities. Enables operators at multiple warehouse gates (Gate A, Gate B) to log barcode scans, package photographs, and carrier metadata with immediate live supervisor dashboard synchronization over WebSockets.

---

## System Overview

The Warehouse Gate Tracking System is an edge-hosted local web application engineered for zero-latency, high-throughput warehouse gate operations using Zebra Android barcode scanner terminals and industrial mobile workstations.

### Key Capabilities

- **Fixed Gate Entry Portals:** Dedicated gate entry interfaces permanently bound by URL parameters (Gate A and Gate B), preventing operator misconfiguration.
- **Barcode Scanner Ingestion:** Optimized for hardware barcode wedge scanners (Zebra Android devices) with automated autofocus and keystroke ingestion.
- **Dual-Storage Architecture:**
  - **Structured Telemetry (PostgreSQL 16):** Persistent transactional records of scans, timestamps, gate IDs, carrier references, and operator IDs.
  - **Object Storage (MinIO S3-Compatible):** Local, high-performance object storage for high-resolution box condition photographs and shipping labels.
- **Live Supervisor Dashboard:** Real-time monitoring console displaying gate scan velocity, inbound vs. outbound traffic breakdown, and recent scan feeds with zero-refresh WebSocket pushes.
- **Containerized On-Premises Deployment:** Fully orchestrated via Docker Compose with an Nginx reverse proxy fronting all traffic on port 80.

---

## System Architecture

`
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
`

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Radix UI, Lucide | Responsive operator scanning UI and supervisor command center |
| **Backend** | Node.js, Express, TypeScript | REST API, validation middleware, and WebSocket broadcasting |
| **Database** | PostgreSQL 16 Alpine | ACID transactional storage for barcode scans and audit logs |
| **Object Storage**| MinIO | On-premises S3-compatible storage for package condition photos |
| **Realtime** | WebSocket (ws) | Sub-second push notifications of new scans to active dashboards |
| **Proxy** | Nginx Alpine | Single port 80 entrypoint, SSL termination, and routing |
| **Orchestration**| Docker Compose | Isolated multi-container deployment on local warehouse server |

---

## URL Structure

| URL Endpoint | Target User | Description |
| :--- | :--- | :--- |
| http://<SERVER-IP>/entry?gate=A | Gate A Operator | Dedicated inbound/outbound scan and photo submission portal for Gate A |
| http://<SERVER-IP>/entry?gate=B | Gate B Operator | Dedicated inbound/outbound scan and photo submission portal for Gate B |
| http://<SERVER-IP>/dashboard | Shift Supervisor | Live dashboard showing real-time scan events, statistics, and image reviews |

---

## Project Structure

`
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
`

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on the host system
- Static IP address assigned to the host server on the warehouse local network

### Running the Entire Stack

1. **Clone the repository:**
   `ash
   git clone https://github.com/niyajuban/gate-tracking-system.git
   cd gate-tracking-system
   `

2. **Configure Environment Variables (Optional):**
   The docker-compose.yml comes with default local credentials. Custom configurations can be specified in warehouse-backend/.env.

3. **Start all services:**
   `ash
   docker compose up -d --build
   `

4. **Verify running containers:**
   `ash
   docker compose ps
   `
   All 5 services (postgres, minio, ackend, rontend, and 
ginx) should report a healthy/running status.

5. **Access the System:**
   - **Gate A Terminal:** http://<SERVER-IP>/entry?gate=A
   - **Gate B Terminal:** http://<SERVER-IP>/entry?gate=B
   - **Supervisor Dashboard:** http://<SERVER-IP>/dashboard
   - **MinIO Object Console:** http://<SERVER-IP>:9001 (Default: minioadmin / minioadmin123)

---

## License

This project is licensed under the ISC License.
