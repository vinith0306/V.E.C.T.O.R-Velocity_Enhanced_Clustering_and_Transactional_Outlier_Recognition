#!/bin/bash
# =============================================================================
# V.E.C.T.O.R Run Script for Fedora (WSL)
# Starts MongoDB, Redis, generates dataset, trains models, seeds DB,
# launches backend and frontend.
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/Backend"
FRONTEND_DIR="${SCRIPT_DIR}/Frontend"
VENV_DIR="${HOME}/vector_venv"
DATA_DIR="${BACKEND_DIR}/bitcoin/data"

echo "═══════════════════════════════════════════════════════════════"
echo "  V.E.C.T.O.R — System Launcher"
echo "═══════════════════════════════════════════════════════════════"

# ─── Activate Python venv ────────────────────────────────────────────
if [ -f "${VENV_DIR}/bin/activate" ]; then
    source "${VENV_DIR}/bin/activate"
    echo "✓ Python venv activated"
else
    echo "⚠ No venv found at ${VENV_DIR}. Run ./setup_fedora.sh first."
    exit 1
fi

# ─── 1. Start MongoDB ───────────────────────────────────────────────
echo ""
echo "▶ [1/7] Starting MongoDB..."
if pgrep -x mongod > /dev/null 2>&1; then
    echo "  MongoDB already running."
else
    # Try systemctl first, then manual start
    sudo systemctl start mongod 2>/dev/null || {
        echo "  Starting mongod manually..."
        sudo mkdir -p /data/db 2>/dev/null || true
        mongod --dbpath /data/db --fork --logpath /tmp/mongod.log 2>/dev/null || {
            # Last resort: run without fork
            mongod --dbpath /tmp/mongodb_data --port 27017 &
            sleep 2
        }
    }
    echo "  MongoDB started."
fi

# ─── 2. Start Redis ─────────────────────────────────────────────────
echo ""
echo "▶ [2/7] Starting Redis..."
if pgrep -x redis-server > /dev/null 2>&1; then
    echo "  Redis already running."
else
    sudo systemctl start redis 2>/dev/null || {
        echo "  Starting redis-server manually..."
        redis-server --daemonize yes 2>/dev/null || {
            redis-server &
            sleep 1
        }
    }
    echo "  Redis started."
fi

# ─── 3. Generate Synthetic Dataset ──────────────────────────────────
echo ""
echo "▶ [3/7] Generating synthetic Bitcoin dataset..."
mkdir -p "${DATA_DIR}"
cd "${BACKEND_DIR}"

if [ ! -f "${DATA_DIR}/bitcoin_dataset.csv" ]; then
    python3 -m bitcoin.generate_dataset \
        --count 5000 \
        --output "${DATA_DIR}" \
        --formats csv json xml \
        --seed 42
    echo "  Dataset generated at ${DATA_DIR}"
else
    echo "  Dataset already exists. Skipping generation."
    echo "  (Delete ${DATA_DIR}/bitcoin_dataset.csv to regenerate)"
fi

# ─── 4. Run Bulk Ingestion Pipeline ─────────────────────────────────
echo ""
echo "▶ [4/7] Running bulk ingestion pipeline..."
cd "${BACKEND_DIR}"
python3 -m bitcoin.bulk_ingest \
    --input "${DATA_DIR}/bitcoin_dataset.csv" \
    --format csv \
    2>&1 | tail -20
echo "  Bulk ingestion complete."

# ─── 5. Train ML Models (if not already trained) ────────────────────
echo ""
echo "▶ [5/7] Training ML models..."
cd "${BACKEND_DIR}"
if [ ! -f "${BACKEND_DIR}/bitcoin/models/bitcoin_fallback_xgboost.joblib" ]; then
    python3 -m bitcoin.train 2>&1 || echo "  ⚠ Model training skipped (will use heuristic scoring)"
else
    echo "  Models already trained. Skipping."
fi

# ─── 6. Start Express.js Backend Server ─────────────────────────────
echo ""
echo "▶ [6/7] Starting Express.js backend server..."
cd "${FRONTEND_DIR}"

# Kill any existing server on port 3001
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

node server/index.js &
SERVER_PID=$!
echo "  Backend server started (PID: ${SERVER_PID}) on port 3001"
sleep 3

# ─── 7. Start Vite Frontend Dev Server ──────────────────────────────
echo ""
echo "▶ [7/7] Starting Vite frontend dev server..."
cd "${FRONTEND_DIR}"

# Kill any existing server on port 5173
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
echo "  Frontend started (PID: ${FRONTEND_PID}) on port 5173"
sleep 3

# ─── Summary ────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ V.E.C.T.O.R is running!"
echo ""
echo "  🌐 Dashboard:     http://localhost:5173"
echo "  🔌 API Server:    http://localhost:3001"
echo "  📊 MongoDB:       mongodb://localhost:27017/RedisTransactions"
echo "  ⚡ Redis:          localhost:6379"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "═══════════════════════════════════════════════════════════════"

# Wait for user to press Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down V.E.C.T.O.R..."
    kill ${SERVER_PID} 2>/dev/null || true
    kill ${FRONTEND_PID} 2>/dev/null || true
    echo "Done."
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
