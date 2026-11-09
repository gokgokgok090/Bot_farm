#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and set BOT_PASSWORD."
  exit 1
fi
npm install
npm start
