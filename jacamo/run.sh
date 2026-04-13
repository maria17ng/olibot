#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# run.sh — Start the OLIBOT JaCaMo agent using the Gradle wrapper.
#
# No local Gradle installation needed.
# First run downloads (cached in ~/.gradle after that):
#   • Gradle 8.10.2  (~180 MB)
#   • JaCaMo 1.3.0 + dependencies  (~80 MB)
#
# Usage:
#   chmod +x run.sh
#   ./run.sh
#
# To stop: Ctrl+C
# ─────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Sanity: java must be available
if ! command -v java &>/dev/null; then
    echo "ERROR: Java 17+ is required but 'java' was not found in PATH."
    exit 1
fi

echo ">>> Starting OLIBOT JaCaMo agent on port 8080..."
echo "    (First run downloads Gradle + JaCaMo deps — may take a few minutes.)"
echo "    Press Ctrl+C to stop."
echo ""

./gradlew run