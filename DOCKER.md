# Docker deployment for Brick-Counter-Backend (tile-production-management)

This document explains how to run the `tile-production-management` backend together with Redis and Mosquitto using Docker Compose.

Prerequisites
- Docker and Docker Compose installed on your machine.

What was added
- `tile-production-management/Dockerfile` — multi-stage Dockerfile for building the NestJS app.
- `tile-production-management/.dockerignore` — excludes node_modules, dist, etc.
- `docker-compose.yml` — orchestrates `backend`, `redis`, and `mosquitto` services.
- `mosquitto/mosquitto.conf` — simple config enabling websockets on port 9001.

Build & Run (development / simple production)
1. From the `Brick-Counter-Backend` directory run:

```powershell
docker-compose up --build
```

2. The backend will be available on http://localhost:3000 (if your app listens on PORT=3000).
   Redis will be exposed on 6379 and Mosquitto on 1883 (and 9001 for websockets).

Environment variables
- The `docker-compose.yml` sets common variables (REDIS_HOST, REDIS_PORT, MQTT_BROKER_URL, MQTT_PORT).
- If your NestJS app requires other env vars (DB connection, JWT secrets, etc.) create a `.env` file
  and add it to the `backend` service in `docker-compose.yml` like:

```yaml
    env_file:
      - ./tile-production-management/.env
```

Notes & security
- `mosquitto.conf` uses `allow_anonymous true` for ease of local testing; do NOT use this in production.
- Exposed ports are convenient for local dev. For production, consider network restrictions, authentication,
  persistent volumes for Redis, and secure Mosquitto config.

Next steps
- If you want DB (Postgres) container included, I can add it and wire TypeORM config.
- If you use MQTT over websockets, confirm frontend uses ws://localhost:9001 or adjust config.
