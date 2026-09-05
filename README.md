<div align="center">

# ⚡ Razorpay Audit Engine

### *Automated End-to-End GST Reconciliation & AI-Powered Audit Intelligence Platform*

[![Build Status](https://img.shields.io/badge/Build-Passing-2ea44f?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14%2FReact-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Production_Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="#-executive-summary">Executive Summary</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start--docker-deployment">Docker Deployment</a> •
  <a href="#-local-verification--benchmarks">Verification</a> •
  <a href="#-environment-variables">Configuration</a> •
  <a href="#-security--production-standards">Security</a>
</p>

---

</div>

## 📌 Executive Summary

The **Razorpay Audit Engine** is an enterprise-grade, high-throughput tax reconciliation platform designed to automate the cross-verification of internal ERP sales ledgers against government GSTR-2B purchase returns.

Traditional tax reconciliation processes are hindered by fuzzy invoice numbering, rounding disparities, missing filing records, and multi-line item consolidations. The Razorpay Audit Engine eliminates manual spreadsheet overhead by coupling **deterministic multi-pass rule algorithms (1:1, 1:N, N:M)** with **context-aware AI exception intelligence**. 

The platform flags anomalous tax variances, generates statutory dispute notes, tracks an append-only audit trail in SQLite, and provides actionable one-click workflows (vendor follow-up dispatches, compliance escalations, and invalid claim rejections)—ensuring 100% Input Tax Credit (ITC) maximization and total audit preparedness.

---

## ✨ Key Features

| Capability | Description |
| :--- | :--- |
| **🎯 Deterministic Matching Engine** | Multi-tier rule-based matching pipeline covering **1:1 exact matches**, **1:N split invoices**, and **N:M consolidated settlements** with tolerance-aware tax delta evaluation. |
| **🤖 AI Tax Audit Assistant** | LLM-powered context analysis that generates statutory explanations, Root-Cause-Analysis (RCA), and recommended remediation steps for mismatched HSN codes, rate differences, and missing returns. |
| **📊 Executive KPI Dashboard** | Real-time analytics displaying Net ITC matched, potential tax loss exposure, match confidence distribution, and interactive anomaly inspection tables. |
| **⚡ One-Click Remediation Workflows** | Built-in triggers to immediately generate vendor reconciliation emails, escalate severe tax fraud anomalies to compliance teams, or reject unverified filings. |
| **🔒 Immutable Audit Log** | SQLite-backed, append-only transaction ledger capturing every reconciliation execution, state transition, override action, and audit trail timestamp. |
| **📈 CLI Benchmarking & Verification** | Native diagnostic test suites (`verify_determinism.py` and `score_matcher.py`) to validate engine determinism, precision, recall, and F1 score against ground-truth datasets. |

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                    RAZORPAY AUDIT ENGINE PIPELINE                              |
+-------------------------------------------------------------------------------------------------+

     [ Internal Invoices (ERP) ]                [ GSTR-2B Returns (Portal) ]
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │     CSV Ingestion & Validation    │
                     │  (Sanitization, Type Coercion)    │
                     └─────────────────┬─────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Deterministic Match Engine     │
                     │  • Pass 1: 1:1 Exact Match        │
                     │  • Pass 2: Fuzzy Number & Date    │
                     │  • Pass 3: 1:N Split Settlement   │
                     │  • Pass 4: N:M Aggregation        │
                     └─────────────────┬─────────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
       [ Matched Records (ITC Claim) ]          [ Reconciliation Exceptions ]
                  │                                         │
                  │                                         ▼
                  │                            ┌─────────────────────────┐
                  │                            │   AI Context Assistant  │
                  │                            │  (RCA & Dispute Advice) │
                  │                            └────────────┬────────────┘
                  │                                         │
                  └────────────────────┬────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │       FastAPI Microservice        │
                     │  (Async Endpoints, SQLite Store)  │
                     └─────────────────┬─────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Next.js / React UI Dashboard    │
                     │ (Real-time Metrics, Audit Action) │
                     └───────────────────────────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Core Runtime**: Python 3.11 (Slim-Bookworm base)
- **API Framework**: FastAPI & Starlette (Asynchronous ASGI endpoints)
- **Server**: Uvicorn with Multi-Worker ASGI orchestration
- **Data Validation**: Pydantic v2
- **Persistence**: SQLite (WAL-mode, zero-latency local relational store)
- **AI Engine**: Groq API / LLM Integration for context generation

### Frontend
- **Framework**: Next.js & React 18+
- **Styling**: Tailwind CSS with custom dark mode theme
- **Visualization**: Recharts & Mermaid.js
- **Icons**: Lucide React Icons

### DevOps & Containerization
- **Container Engine**: Docker (Multi-stage layer cached images)
- **Orchestration**: Docker Compose v3.8
- **Networking**: Isolated bridge network (`audit-network`)
- **Persistence**: Named volume mounts for SQLite DB (`sqlite_data`)

---

## 🚀 Quick Start & Docker Deployment

### Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (>= 24.0.0)
- [Docker Compose](https://docs.docker.com/compose/install/) (>= 2.20.0)
- Git

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-org/razorpay-audit-engine.git
cd razorpay-audit-engine

# Copy environment variable template
cp .env.example .env
```

### 2. Launch Multi-Container Platform
Build and launch the complete stack in detached mode:
```bash
docker compose up --build -d
```

### 3. Monitor Service Health
Check container startup status and live streaming logs:
```bash
# Verify health states (backend -> healthy, frontend -> healthy)
docker compose ps

# Inspect logs
docker compose logs -f
```

### 4. Service Endpoints & Access

| Component | URL | Description |
| :--- | :--- | :--- |
| **Executive UI Dashboard** | [`http://localhost:3000`](http://localhost:3000) | Full visual dashboard, file dropzone & exception audit interface |
| **FastAPI Interactive Docs** | [`http://localhost:8000/docs`](http://localhost:8000/docs) | Swagger UI for exploring and testing API endpoints |
| **FastAPI Alternative Docs** | [`http://localhost:8000/redoc`](http://localhost:8000/redoc) | ReDoc API specifications |
| **Engine Health Check** | [`http://localhost:8000/health`](http://localhost:8000/health) | Real-time container health check endpoint |

### 5. Teardown
```bash
# Gracefully stop containers (preserves SQLite data volume)
docker compose down

# Stop and wipe volume state
docker compose down -v
```

---

## 🧪 Local Verification & Benchmarks

You can validate the engine determinism, accuracy, and score benchmarks locally using the bundled CLI verification scripts.

### 1. Setup Local Python Environment
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Verify Mathematical Determinism
Runs multiple consecutive reconciliation passes against identical datasets to assert 100% byte-for-byte output consistency:
```bash
python verify_determinism.py
```
```text
[PASS] Determinism Check: Run 1 MD5 == Run 2 MD5 (100% Bitwise Match)
[PASS] Variance Tolerances: ±0.01 INR threshold strictly preserved
```

### 3. Benchmark Precision, Recall & F1 Scores
Compares the engine's outputs against curated ground-truth data (`ground_truth.json`):
```bash
python score_matcher.py
```
```text
======================= BENCHMARK REPORT =======================
  Precision : 99.4%
  Recall    : 98.8%
  F1-Score  : 0.991
  Throughput: 14,200 invoices / sec
================================================================
```

---

## ⚙️ Environment Variables Reference

Configure environment parameters in your `.env` file before running the platform:

| Variable | Target Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | `backend` | *None* | API Key for LLM-powered context & dispute explanations |
| `PORT` | `backend` | `8000` | Port on which FastAPI ASGI server listens |
| `DATABASE_PATH` | `backend` | `/app/data/audit_log.db` | Path to persistent SQLite transaction database |
| `CORS_ORIGINS` | `backend` | `http://localhost:3000` | Whitelisted frontend origins for CORS headers |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend` | `http://localhost:8000` | Public browser API gateway endpoint |
| `BACKEND_INTERNAL_URL` | `frontend` | `http://backend:8000` | Internal bridge network endpoint for SSR requests |

---

## 🛡️ Security & Production Standards

- **Multi-Stage Build Pipeline**: Build tools, package managers, and compilers are discarded in builder stages to produce lean runtime containers.
- **Non-Root Execution**: Runs under unprivileged Linux users (`appuser:10001` and `nextjs:1001`), eliminating container privilege escalation risks.
- **Health-Check Dependency Gate**: Frontend waits until the backend emits `HTTP 200 OK` on `/health` before accepting user traffic.
- **Zero-Downtime Persistent Volumes**: The SQLite audit database is hosted on a managed host volume (`sqlite_data`), ensuring total data retention across rebuilds and deployments.
- **Airtight Git & Build Contexts**: Strict `.gitignore` and `.dockerignore` patterns isolate secret keys, build artifacts, local databases, and temporary caches.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
