#!/bin/bash

set -Eeo pipefail

echo "Starting backend..."
npm start --prefix /app/backend &
echo "Starting frontend..."
npm run dev --prefix /app/frontend &
sleep 5
echo "Starting nginx..."
exec "$@"