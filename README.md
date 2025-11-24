# PIMS Cloud Analytics API

Cloud API service for receiving and serving analytics data from the offline PIMS pharmacy system.

## Overview

This service acts as a bridge between the offline LAN-based pharmacy system and an online web application. It:
- Receives analytics snapshots from the LAN system via API key authentication
- Stores the latest snapshot per pharmacy
- Provides JWT-authenticated endpoints for the web app to retrieve data
- Tracks when data was last updated

## Features

- **API Key Authentication**: Secure endpoint for LAN system to upload analytics
- **JWT Authentication**: Secure endpoints for web app access
- **Single Owner Account**: Simplified authentication for pharmacy owner
- **Latest Snapshot Storage**: Stores only the most recent analytics (overwrites previous)
- **Last Updated Tracking**: Tracks when database was last updated

## Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pims_cloud_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=3600s
OWNER_USERNAME=admin
OWNER_PASSWORD=your-secure-password
OWNER_FULL_NAME=Pharmacy Owner
PHARMACY_ID=pharmacy_1
PHARMACY_NAME=Main Pharmacy
PHARMACY_API_KEY=your-secure-api-key
```

4. Set up database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (creates owner account and pharmacy)
npm run prisma:seed
```

⚠️ **IMPORTANT**: Save the API key shown during seeding - it's needed for the LAN system to upload data.

### Running the API

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will run on `http://localhost:3000` (or PORT from .env)

Swagger documentation: `http://localhost:3000/api`

## API Endpoints

### LAN System Endpoints (API Key Protected)

#### POST /api/analytics/:pharmacyId
Receive analytics snapshot from LAN system.

**Headers:**
- `x-api-key`: API key for authentication
- `Content-Type`: application/json

**Body:**
```json
{
  "analytics": { ... },
  "hash": "sha256-hash-string",
  "uploadedAt": "2024-01-01T00:00:00.000Z"
}
```

### Web App Endpoints (JWT Protected)

#### POST /auth/login
Login to get JWT token.

**Body:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "admin",
    "fullName": "Pharmacy Owner"
  }
}
```

#### GET /api/pharmacy/analytics/latest
Get latest analytics snapshot.

**Headers:**
- `Authorization`: Bearer {jwt-token}

**Response:**
```json
{
  "pharmacyId": "pharmacy_1",
  "pharmacyName": "Main Pharmacy",
  "lastUpdatedAt": "2024-01-01T00:00:00.000Z",
  "analytics": { ... },
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "storedAt": "2024-01-01T00:00:01.000Z"
}
```

#### GET /api/pharmacy/analytics/last-updated
Get last updated timestamp.

**Headers:**
- `Authorization`: Bearer {jwt-token}

**Response:**
```json
{
  "pharmacyId": "pharmacy_1",
  "lastUpdatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Configuration for LAN System

In your LAN system's `.env` file, configure:

```env
REMOTE_ANALYTICS_BASE_URL=https://your-cloud-api-domain.com
REMOTE_ANALYTICS_API_KEY=the-api-key-from-seeding
REMOTE_ANALYTICS_PHARMACY_ID=pharmacy_1
```

## Project Structure

```
src/
├── api-key/          # API key authentication for LAN uploads
├── auth/             # JWT authentication for web app
├── analytics/        # Analytics endpoints and services
├── pharmacy/         # Pharmacy endpoints
├── prisma/           # Prisma client and module
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

## Security

- API keys are hashed using bcrypt before storage
- Passwords are hashed using bcrypt
- JWT tokens expire after 1 hour (configurable)
- CORS can be configured via `CORS_ORIGIN` environment variable

## Database Schema

- **Owner**: Single owner account for web app access
- **Pharmacy**: Pharmacy information and API key storage
- **AnalyticsSnapshot**: Latest analytics data per pharmacy (one record per pharmacy)

## License

UNLICENSED

