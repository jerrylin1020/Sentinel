#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"

if [[ -n "${PIDS}" ]]; then
  while IFS= read -r PID; do
    [[ -z "${PID}" ]] && continue
    COMMAND="$(ps -p "${PID}" -o command= 2>/dev/null || true)"
    PROCESS_CWD="$(lsof -a -p "${PID}" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
    PARENT_PID="$(ps -p "${PID}" -o ppid= 2>/dev/null | tr -d ' ')"
    PARENT_COMMAND="$(ps -p "${PARENT_PID}" -o command= 2>/dev/null || true)"
    PARENT_CWD="$(lsof -a -p "${PARENT_PID}" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"

    if [[ "${COMMAND}" != *"next-server"* && "${COMMAND}" != *"next dev"* ]]; then
      echo "Port ${PORT} is occupied by a non-Next.js process (PID ${PID}):"
      echo "${COMMAND}"
      exit 1
    fi

    if [[ "${PROCESS_CWD}" != "${ROOT_DIR}" && "${PROCESS_CWD}" != "${ROOT_DIR}/apps/web" ]]; then
      echo "Port ${PORT} is occupied by a Next.js server from another project (PID ${PID}):"
      echo "${PROCESS_CWD}"
      exit 1
    fi

    echo "Stopping previous Sentinel Next.js server on port ${PORT} (PID ${PID})..."
    if [[ "${PARENT_COMMAND}" == *"next dev"* && ( "${PARENT_CWD}" == "${ROOT_DIR}" || "${PARENT_CWD}" == "${ROOT_DIR}/apps/web" ) ]]; then
      kill "${PID}" "${PARENT_PID}" 2>/dev/null || true
    else
      kill "${PID}"
    fi
  done <<< "${PIDS}"

  for _ in {1..50}; do
    if ! lsof -tiTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done

  if lsof -tiTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    REMAINING_PID="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN | head -1)"
    REMAINING_COMMAND="$(ps -p "${REMAINING_PID}" -o command= 2>/dev/null || true)"
    REMAINING_CWD="$(lsof -a -p "${REMAINING_PID}" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
    if [[ ( "${REMAINING_COMMAND}" == *"next-server"* || "${REMAINING_COMMAND}" == *"next dev"* ) && ( "${REMAINING_CWD}" == "${ROOT_DIR}" || "${REMAINING_CWD}" == "${ROOT_DIR}/apps/web" ) ]]; then
      echo "Previous server did not exit gracefully; force-stopping PID ${REMAINING_PID}..."
      kill -KILL "${REMAINING_PID}"
    else
      echo "Port ${PORT} is still occupied by an unexpected process."
      exit 1
    fi
  fi
fi

cd "${ROOT_DIR}"
exec pnpm --filter @sentinel/web dev
