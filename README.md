# Warehouse Gate Tracking System

An on-premises, containerized real-time gate inbound and outbound tracking platform designed for logistics and warehouse facilities. Enables operators at Gate A and Gate B to log barcode scans, box condition photos, and carrier data with live supervisor dashboard updates over WebSockets.

---

## Key Features

- **Zebra Scanner Integration:** Instant barcode capture using industrial Zebra Android terminals (TC21/TC26) via DataWedge keystroke auto-injection.
- **Fixed Gate Portals:** Dedicated URLs for Gate A and Gate B (`/entry?gate=A`, `/entry?gate=B`) to prevent human gate selection errors.
- **Dual-Storage Engine:** PostgreSQL 16 for ACID transactional scan records and MinIO (S3-compatible) for package condition photographs.
- **Live Supervisor Command Center:** Zero-refresh real-time scan feed, velocity metrics, and photo audit via WebSocket broadcasting.
- **On-Premises Docker Deployment:** Fully containerized with Nginx reverse proxy on port 80.

---

## Operation Workflow

1. **Barcode Scan & Entry:** Operator scans the package barcode at Gate A or B using a Zebra Android scanner (via DataWedge auto-injection) and captures optional box condition photos.
2. **Form Submission:** Next.js frontend sends a `POST` request with scan metadata and photo payload to the Nginx ingress.
3. **Backend Validation:** Node.js/Express API receives, validates, and processes the scan payload.
4. **Data Persistence:**
   - **PostgreSQL:** Stores transactional scan details (tracking number, gate, timestamp, operator, carrier).
   - **MinIO S3:** Stores high-resolution package and label photos.
5. **WebSocket Broadcast:** Backend pushes the new scan event to all active dashboard connections.
6. **Real-Time Dashboard Update:** Supervisor dashboard instantly refreshes statistics, activity logs, and image viewer without reloading the page.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Field Hardware** | Zebra Android (TC21/TC26) | Industrial barcode scanning via DataWedge & photo capture |
| **Frontend** | Next.js 16, React 19, Tailwind CSS | Operator scanning form and supervisor command dashboard |
| **Backend** | Node.js, Express, TypeScript | REST API endpoints, validation, and WebSocket broadcasting |
| **Database** | PostgreSQL 16 | Transactional database for all scan logs and audit records |
| **Object Storage** | MinIO (S3-Compatible) | On-premises storage for box and shipping label photos |
| **Real-Time** | WebSocket (`ws`) | Sub-second push notifications to connected supervisor screens |
| **Reverse Proxy** | Nginx | Single port 80 entrypoint, static file delivery, and routing |
| **DevOps** | Docker, Docker Compose | Multi-container orchestration on local server laptop |

---

## URL Structure

| URL Endpoint | Target User | Description |
| :--- | :--- | :--- |
| `http://<SERVER-IP>/entry?gate=A` | Gate A Operator (Zebra) | Dedicated scan and photo submission portal for Gate A |
| `http://<SERVER-IP>/entry?gate=B` | Gate B Operator (Zebra) | Dedicated scan and photo submission portal for Gate B |
| `http://<SERVER-IP>/dashboard` | Shift Supervisor | Live dashboard showing real-time scans, velocity, and photos |

---

## Project Structure

```text
.
├── docker-compose.yml           # Multi-container orchestration definition
├── .gitignore                   # Repository ignore rules
├── frontend/                    # Next.js web application
│   ├── app/                     # Next.js App Router pages (entry, dashboard)
│   ├── components/              # Reusable UI components & tables
│   ├── hooks/                   # WebSocket and responsive hooks
│   ├── lib/                     # API client and TypeScript definitions
│   ├── public/                  # Brand assets and icons
│   ├── Dockerfile               # Production Next.js container build
│   └── package.json
├── warehouse-backend/           # Express & TypeScript backend API
│   ├── src/
│   │   ├── db/                  # PostgreSQL pool and MinIO client
│   │   ├── middleware/          # Multer memory-storage upload pipeline
│   │   ├── routes/              # Scan creation, retrieval, and backup
│   │   ├── websocket/           # WebSocket broadcast server
│   │   └── index.ts             # Service entry point and HTTP listener
│   ├── Dockerfile               # Production backend container build
│   ├── tsconfig.json
│   └── package.json
└── warehouse-nginx/             # Reverse proxy configuration
    └── nginx.conf               # Port 80 routing for frontend, API, and WebSockets
```

---

## Quick Start

### Running with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone https://github.com/niyajuban/gate-tracking-system.git
   cd gate-tracking-system
   ```

2. **Start all services:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify running containers:**
   ```bash
   docker compose ps
   ```

4. **Access the System:**
   - **Gate A Entry:** `http://localhost/entry?gate=A`
   - **Gate B Entry:** `http://localhost/entry?gate=B`
   - **Supervisor Dashboard:** `http://localhost/dashboard`
   - **MinIO Console:** `http://localhost:9001` (`minioadmin` / `minioadmin123`)

---

## License

This project is licensed under the ISC License.
