# City-wide Lost & Found Network with AI Image Matching

A full-stack platform that connects lost-and-found offices across malls, metro stations, airports, hotels, taxis, and hospitals. Venue staff upload photos of found items; item owners describe or photograph what they lost; an AI model (CLIP) matches them using image and text similarity.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schemas](#4-database-schemas)
5. [Data Flow](#5-data-flow)
6. [API Reference](#6-api-reference)
7. [Environment Variables](#7-environment-variables)
8. [Getting Started](#8-getting-started)
9. [Running the Project](#9-running-the-project)
10. [Default Accounts](#10-default-accounts)
11. [Frontend — User App](#11-frontend--user-app)
12. [Admin Panel](#12-admin-panel)
13. [Real-time Notifications](#13-real-time-notifications)
14. [AI Matching Pipeline](#14-ai-matching-pipeline)
15. [Postman Collection](#15-postman-collection)
16. [Swagger Docs](#16-swagger-docs)

---

## 1. Project Structure

```
City-wide-lost-and-found-network-with-image-matching/
│
├── backend/                        # Django 4.2 REST API
│   ├── apps/
│   │   ├── authentication/         # JWT auth, user model, admin user mgmt
│   │   │   ├── models.py           # User (admin / venue_staff / owner)
│   │   │   ├── views.py            # Register, Login, Logout, Me
│   │   │   ├── admin_views.py      # Legacy admin user endpoints
│   │   │   ├── serializers.py      # Register, UserSerializer, AdminUserSerializer
│   │   │   ├── urls.py
│   │   │   └── management/
│   │   │       └── commands/
│   │   │           └── create_defaults.py   # Seed default accounts
│   │   │
│   │   ├── venues/                 # Venue CRUD + operating hours
│   │   │   ├── models.py           # Venue, VenueOperatingHours
│   │   │   ├── views.py            # VenueViewSet (slug-based)
│   │   │   ├── serializers.py
│   │   │   ├── permissions.py      # IsAdminUser, IsAdminOrReadOnly, IsVenueStaffOrAdmin
│   │   │   └── filters.py          # VenueFilter (city, state, type, status)
│   │   │
│   │   ├── items/                  # Found & Lost items (MongoDB)
│   │   │   ├── views.py            # FoundItemListCreate, LostItemListCreate, detail views
│   │   │   ├── serializers.py
│   │   │   ├── services.py         # MongoDB CRUD helpers, S3 image upload
│   │   │   └── tasks.py            # Celery: generate_embedding task
│   │   │
│   │   ├── matching/               # AI similarity matching
│   │   │   ├── engine.py           # CLIP embeddings → Elasticsearch kNN search
│   │   │   ├── views.py            # ItemMatchesView, ImageSearchView, TextSearchView
│   │   │   └── serializers.py
│   │   │
│   │   ├── claims/                 # Claim lifecycle management
│   │   │   ├── models.py           # Claim, PickupSlot, ClaimStatusHistory
│   │   │   ├── views.py            # List/Create/Detail + Review/Delivery/Complete/Cancel
│   │   │   │                       # + ID verification (upload-id/verify-id)
│   │   │   │                       # + Dispute resolution
│   │   │   ├── serializers.py
│   │   │   └── services.py         # Business logic: submit, review, complete, cancel
│   │   │
│   │   ├── notifications/          # In-app notifications + WebSocket push
│   │   │   ├── models.py           # Notification model (PostgreSQL)
│   │   │   ├── views.py            # NotificationListView, NotificationMarkReadView
│   │   │   ├── consumers.py        # Django Channels WS consumer (/ws/notifications/)
│   │   │   ├── urls.py
│   │   │   └── routing.py
│   │   │
│   │   ├── chat/                   # Per-claim live chat
│   │   │   ├── models.py           # ChatRoom, ChatMessage
│   │   │   ├── views.py            # ChatRoomsListView, ChatRoomView, ChatHistoryView, ChatPresenceView
│   │   │   ├── serializers.py
│   │   │   ├── consumers.py        # Django Channels WS consumer (/ws/chat/<room_id>/)
│   │   │   ├── urls.py
│   │   │   └── routing.py
│   │   │
│   │   ├── analytics/              # Admin analytics dashboard
│   │   │   ├── views.py            # AnalyticsOverviewView, AnalyticsDailyView
│   │   │   └── urls.py
│   │   │
│   │   └── admin_panel/            # Dedicated admin REST API (all /api/v1/admin/)
│   │       ├── views.py            # Stats, Users, Venues, Items, Claims
│   │       ├── serializers.py
│   │       └── urls.py
│   │
│   ├── core/
│   │   ├── ai/
│   │   │   └── clip_encoder.py     # OpenAI CLIP model wrapper
│   │   ├── db/
│   │   │   ├── mongo.py            # MongoDB connection + collection helpers
│   │   │   └── elasticsearch_client.py
│   │   └── utils/
│   │       ├── exceptions.py
│   │       ├── middleware.py       # Request logging
│   │       └── throttles.py
│   │
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py             # All shared settings
│   │   │   └── development.py      # DEBUG overrides
│   │   ├── urls.py                 # Root URL config
│   │   ├── asgi.py                 # ASGI (HTTP + WebSocket)
│   │   └── wsgi.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                        # Environment variables
│
├── frontend/                       # React 19 user-facing app  (port 3000)
│   ├── src/
│   │   ├── api/                    # Axios API modules (auth, items, claims, matching)
│   │   ├── components/
│   │   │   ├── layout/             # AppLayout, ProtectedRoute
│   │   │   └── ui/                 # shadcn-style components
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Register
│   │   │   ├── dashboard/          # Dashboard
│   │   │   ├── items/              # Found/Lost item pages
│   │   │   ├── claims/             # Claims list, submit, detail
│   │   │   ├── search/             # AI image/text search
│   │   │   └── notifications/      # Notification centre
│   │   ├── store/                  # Zustand auth store
│   │   └── types/                  # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts              # Proxy: /api → localhost:8000
│
├── admin/                          # React 19 admin panel  (port 3001)
│   ├── src/
│   │   ├── api/                    # auth, stats, users, venues, items, claims
│   │   ├── components/
│   │   │   ├── layout/             # AdminLayout, Sidebar, AuthGuard
│   │   │   └── ui/                 # button, card, input, select, badge, etc.
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # Admin-only login
│   │   │   ├── Dashboard.tsx       # Stats overview
│   │   │   ├── users/              # UsersPage, UserDetailPage
│   │   │   ├── venues/             # VenuesPage, VenueFormPage
│   │   │   ├── items/              # FoundItemsPage, LostItemsPage
│   │   │   └── claims/             # ClaimsPage, ClaimDetailPage
│   │   ├── store/                  # Zustand auth store (persisted)
│   │   └── types/                  # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts              # port 3001, proxy: /api → localhost:8000
│
├── docker-compose.yml              # All services
├── LostAndFound.postman_collection.json
└── README.md
```

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                       │
│                                                                          │
│   ┌──────────────────┐          ┌───────────────────────────────────┐   │
│   │   User App       │          │          Admin Panel              │   │
│   │  localhost:3000  │          │         localhost:3001            │   │
│   │  (React 19 +     │          │         (React 19 +               │   │
│   │   Vite)          │          │          Vite)                    │   │
│   └────────┬─────────┘          └────────────────┬──────────────────┘   │
└────────────┼────────────────────────────────────┼──────────────────────┘
             │  HTTP /api/v1/*                     │  HTTP /api/v1/admin/*
             │  WS  /ws/notifications/             │
             │  WS  /ws/chat/<room_id>/            │
             ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         DJANGO BACKEND  :8000                           │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Django Channels (ASGI) + Daphne                                │  │
│   │  ┌──────────────────────┐    ┌──────────────────────────────┐  │  │
│   │  │  REST API (DRF)      │    │  WebSocket Consumers         │  │  │
│   │  │  /api/v1/            │    │  /ws/notifications/          │  │  │
│   │  │  - auth              │    │  /ws/chat/<room_id>/         │  │  │
│   │  │  - venues            │    │  Push: claim events,         │  │  │
│   │  │  - items             │    │  match alerts, chat msgs,    │  │  │
│   │  │  - matching          │    │  presence updates            │  │  │
│   │  │  - claims            │    └──────────────────────────────┘  │  │
│   │  │  - notifications     │                                       │  │
│   │  │  - chat              │                                       │  │
│   │  │  - analytics         │                                       │  │
│   │  │  - admin_panel       │    ┌──────────────────────────────┐  │  │
│   │  └──────────────────────┘    │  Celery Worker               │  │  │
│   │                              │  - generate_embedding task   │  │  │
│   │                              │  - CLIP encode image/text    │  │  │
│   │                              │  - store in Elasticsearch    │  │  │
│   │                              └──────────────────────────────┘  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────┬─────────────┘
                            │                              │
         ┌──────────────────┼──────────────────────────────┼──────────┐
         │                  │                              │          │
         ▼                  ▼                              ▼          ▼
  ┌─────────────┐  ┌─────────────────┐   ┌────────────────────┐  ┌────────┐
  │ PostgreSQL  │  │    MongoDB      │   │  Elasticsearch     │  │ Redis  │
  │  :5432      │  │   :27017        │   │     :9200          │  │ :6379  │
  │             │  │                 │   │                    │  │        │
  │ - users     │  │ - found_items   │   │ CLIP embeddings    │  │ Cache  │
  │ - venues    │  │ - lost_items    │   │ kNN vector search  │  │ WS     │
  │ - claims    │  │   (with images, │   │ text search        │  │ Celery │
  │ - pickup    │  │    embeddings)  │   │                    │  │ broker │
  │   slots     │  │                 │   │                    │  │        │
  │ - notifs    │  │                 │   │                    │  │        │
  └─────────────┘  └─────────────────┘   └────────────────────┘  └────────┘
```

### Request flow — uploading a found item

```
Venue Staff → POST /api/v1/items/found/
    │
    ├─► FoundItemListCreateView (Django)
    │       • validates & uploads image to S3/local
    │       • inserts document into MongoDB (found_items)
    │       • status = "available"
    │
    └─► Celery task: generate_embedding(item_id, "found")
            • downloads image from URL
            • runs CLIP encode_image_from_url()
            • runs CLIP encode_text(title + description)
            • indexes doc into Elasticsearch with vector fields
            • updates MongoDB embedding_status = "done"
```

### Request flow — claiming an item

```
Owner → POST /api/v1/claims/
    │
    ├─► ClaimListCreateView.perform_create()
    │       • looks up found item in MongoDB (must be "available")
    │       • creates Claim record in PostgreSQL
    │       • status = "pending"
    │
    └─► WebSocket push via channel_layer
            → "venue_<id>" group  (venue staff notified instantly)
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Django + DRF | 4.2 / 3.15 |
| ASGI server | Django Channels + Daphne | 4.1 |
| Auth | djangorestframework-simplejwt | 5.x |
| Task queue | Celery | 5.4 |
| Task scheduler | django-celery-beat | — |
| API docs | drf-spectacular (Swagger) | 0.27.1 |
| Primary DB | PostgreSQL | 15 |
| Document DB | MongoDB (pymongo) | — |
| Search / vectors | Elasticsearch | 8.x |
| Cache / broker | Redis | 7 |
| AI model | OpenAI CLIP (via Hugging Face) | — |
| Image storage | AWS S3 (django-storages) / local in dev | — |
| Frontend framework | React 19 + TypeScript | — |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS | 3.x |
| Data fetching | TanStack Query v5 | — |
| State | Zustand | 5.x |
| HTTP client | Axios | — |
| Forms | react-hook-form + zod | — |
| Icons | Lucide React | — |
| Containerisation | Docker + Docker Compose | — |

---

## 4. Database Schemas

### PostgreSQL — Entity Relationship

```
┌──────────────────────────────────┐
│              users               │
├──────────────────────────────────┤
│ id           BIGSERIAL PK        │
│ email        VARCHAR UNIQUE      │
│ full_name    VARCHAR             │
│ phone        VARCHAR             │
│ role         ENUM (admin /       │
│              venue_staff / owner)│
│ venue_id     FK → venues(id)     │
│ is_active    BOOLEAN             │
│ is_staff     BOOLEAN             │
│ is_verified  BOOLEAN             │
│ password     VARCHAR (hashed)    │
│ created_at   TIMESTAMPTZ        │
│ updated_at   TIMESTAMPTZ        │
└────────────┬─────────────────────┘
             │ 0..* staff
             │
┌────────────▼─────────────────────┐       ┌────────────────────────────┐
│             venues               │       │    venue_operating_hours   │
├──────────────────────────────────┤       ├────────────────────────────┤
│ id            BIGSERIAL PK       │◄──────┤ id        BIGSERIAL PK     │
│ name          VARCHAR            │  1    │ venue_id  FK → venues      │
│ slug          VARCHAR UNIQUE     │       │ day       INT (0=Mon–6=Sun)│
│ venue_type    ENUM               │       │ open_time TIME             │
│   (mall/metro/airport/hotel/     │       │ close_time TIME            │
│    taxi/bus_station/railway/     │       │ is_closed  BOOLEAN         │
│    hospital/other)               │       └────────────────────────────┘
│ status        ENUM               │
│   (active/inactive/suspended)    │       ┌────────────────────────────┐
│ address       TEXT               │       │       pickup_slots         │
│ city          VARCHAR            │       ├────────────────────────────┤
│ state         VARCHAR            │◄──────┤ id           BIGSERIAL PK  │
│ pincode       VARCHAR            │  1    │ venue_id     FK → venues   │
│ latitude      DECIMAL(9,6)       │       │ date         DATE          │
│ longitude     DECIMAL(9,6)       │       │ start_time   TIME          │
│ contact_name  VARCHAR            │       │ end_time     TIME          │
│ contact_email VARCHAR            │       │ capacity     INT           │
│ contact_phone VARCHAR            │       │ booked_count INT           │
│ operating_hours JSONB            │       └────────────────────────────┘
│ registration_number VARCHAR      │
│ logo          VARCHAR (path)     │
│ created_at    TIMESTAMPTZ       │
│ updated_at    TIMESTAMPTZ       │
└──────────────┬───────────────────┘
               │ 0..*
               │
┌──────────────▼───────────────────┐
│             claims               │
├──────────────────────────────────┤
│ id                 BIGSERIAL PK  │
│ found_item_id      VARCHAR(24)   │ ← MongoDB ObjectId (string)
│ lost_item_id       VARCHAR(24)   │ ← MongoDB ObjectId (string, optional)
│ claimant_id        FK → users    │
│ reviewed_by_id     FK → users    │
│ venue_id           FK → venues   │
│ pickup_slot_id     FK → pickup_slots │
│ status             ENUM          │
│   (pending / under_review /      │
│    approved / rejected /         │
│    pickup_scheduled /            │
│    out_for_delivery /            │
│    completed / cancelled)        │
│ proof_description  TEXT          │
│ proof_images       JSONB (list)  │
│ rejection_reason   TEXT          │
│ reviewed_at        TIMESTAMPTZ  │
│ delivery_method    ENUM          │
│   (pickup / courier)             │
│ delivery_address   TEXT          │
│ delivery_tracking_id VARCHAR     │
│ created_at         TIMESTAMPTZ  │
│ updated_at         TIMESTAMPTZ  │
└──────────────┬───────────────────┘
               │ 1
               │
┌──────────────▼───────────────────┐
│       claim_status_history       │
├──────────────────────────────────┤
│ id           BIGSERIAL PK        │
│ claim_id     FK → claims         │
│ from_status  VARCHAR             │
│ to_status    VARCHAR             │
│ changed_by_id FK → users         │
│ note         TEXT                │
│ changed_at   TIMESTAMPTZ        │
└──────────────────────────────────┘
```

### MongoDB — Document Schemas

**Collection: `found_items`**
```json
{
  "_id":              "ObjectId (24-char hex)",
  "item_type":        "found",
  "venue_id":         42,
  "reported_by":      7,
  "title":            "Black leather wallet",
  "description":      "Found near Gate 3, has initials RK",
  "category":         "wallet",
  "color":            "black",
  "brand":            "Fossil",
  "image_url":        "https://s3.../items/found/abc123.jpg",
  "image_key":        "items/found/abc123.jpg",
  "found_at":         "2026-10-01T14:30:00Z",
  "found_location":   "Terminal 2, Gate 3",
  "attributes":       {},
  "status":           "available | claimed | archived",
  "embedding_status": "pending | processing | done | failed | skipped",
  "created_at":       "ISODate",
  "updated_at":       "ISODate"
}
```

**Collection: `lost_items`**
```json
{
  "_id":              "ObjectId (24-char hex)",
  "item_type":        "lost",
  "reported_by":      15,
  "title":            "Blue backpack",
  "description":      "Nike bag, lost at metro station",
  "category":         "bag",
  "color":            "blue",
  "brand":            "Nike",
  "image_url":        "https://s3.../items/lost/def456.jpg",
  "image_key":        "items/lost/def456.jpg",
  "lost_at":          "2026-09-30T09:00:00Z",
  "lost_location":    "Andheri Metro Station",
  "attributes":       {},
  "status":           "searching | matched | resolved",
  "embedding_status": "pending | processing | done | failed | skipped",
  "created_at":       "ISODate",
  "updated_at":       "ISODate"
}
```

### Elasticsearch — Index `lostfound_items`

```json
{
  "mappings": {
    "properties": {
      "item_id":          { "type": "keyword" },
      "item_type":        { "type": "keyword" },
      "venue_id":         { "type": "integer" },
      "title":            { "type": "text" },
      "description":      { "type": "text" },
      "category":         { "type": "keyword" },
      "status":           { "type": "keyword" },
      "image_embedding":  { "type": "dense_vector", "dims": 512 },
      "text_embedding":   { "type": "dense_vector", "dims": 512 },
      "created_at":       { "type": "date" }
    }
  }
}
```

---

## 5. Data Flow

### AI Matching Pipeline

```
Image Upload (found item)
        │
        ▼
  Django saves image to S3
  MongoDB document created  (embedding_status = "pending")
        │
        ▼
  Celery task queued  ──────────────────────────────────────┐
        │                                                    │
        ▼                                                    ▼
  CLIP encode_image_from_url()               CLIP encode_text(title + desc)
  → 512-dim float vector                     → 512-dim float vector
        │                                             │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
               Elasticsearch index doc
               {image_embedding: [...],
                text_embedding: [...]}
                           │
              MongoDB updated  (embedding_status = "done")

Owner searches → POST /api/v1/matching/search/image/
        │
        ▼
  CLIP encode uploaded image → query vector
        │
        ▼
  Elasticsearch kNN query on image_embedding  (weight 70%)
      +  BM25 text query                       (weight 30%)
        │
        ▼
  Scored results returned  (score > 0.3 threshold)
```

### Claim Lifecycle

```
PENDING ──► UNDER_REVIEW ──► APPROVED ──► PICKUP_SCHEDULED ──► COMPLETED
                │                │                │
                │                └──► OUT_FOR_DELIVERY ──────► COMPLETED
                │
                └──► REJECTED

Any non-terminal status ──► CANCELLED
```

---

## 6. API Reference

### Authentication  `/api/v1/auth/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register/` | Public | Create owner account |
| POST | `/login/` | Public | Returns `{access, refresh, user}` |
| POST | `/logout/` | JWT | Blacklist refresh token |
| POST | `/token/refresh/` | Public | Rotate access token |
| GET | `/me/` | JWT | My profile |
| PATCH | `/me/` | JWT | Update my profile |

### Venues  `/api/v1/venues/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Staff/Admin | List venues |
| POST | `/` | Admin | Create venue |
| GET | `/{slug}/` | Staff/Admin | Venue detail |
| PATCH | `/{slug}/` | Admin | Update venue |
| DELETE | `/{slug}/` | Admin | Delete venue |
| GET/POST | `/{slug}/hours/` | Admin | Get/set operating hours |
| POST | `/{slug}/activate/` | Admin | Activate venue |
| POST | `/{slug}/deactivate/` | Admin | Deactivate venue |
| GET | `/types/` | Any | List venue type choices |

### Items  `/api/v1/items/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/found/` | JWT | List found items (filter: venue_id, category, status) |
| POST | `/found/` | Staff/Admin | Upload found item + one or more images (`images` key) |
| POST | `/found/bulk/` | Staff/Admin | Bulk-create found items from CSV file |
| GET | `/found/{id}/` | JWT | Found item detail |
| GET | `/lost/` | JWT | List lost items (owners see own; admin sees all) |
| POST | `/lost/` | JWT | Report lost item |
| GET | `/lost/{id}/` | JWT | Lost item detail |
| PATCH | `/lost/{id}/` | Owner/Admin | Update lost item fields / images |
| DELETE | `/lost/{id}/` | Owner/Admin | Delete lost item |

**Bulk CSV columns:** `title` (req), `description` (req), `category` (req), `found_at` (req), `color`, `brand`, `found_location`

### AI Matching  `/api/v1/matching/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/{type}/{id}/matches/` | JWT | Get top-k cached matches for a found or lost item |
| POST | `/search/image/` | JWT | Search by uploaded image (CLIP, rate limited 30/min) |
| POST | `/search/text/` | JWT | Search by text description (CLIP, rate limited 30/min) |

### Claims  `/api/v1/claims/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | List claims (role-scoped) |
| POST | `/` | JWT | Submit claim for a found item |
| GET | `/{id}/` | JWT | Claim detail |
| POST | `/{id}/review/` | Staff/Admin | Approve or reject (`action`, `rejection_reason`) |
| POST | `/{id}/delivery/` | Claimant | Choose pickup slot or courier address |
| POST | `/{id}/complete/` | Staff/Admin | Mark as completed (optional `delivery_tracking_id`) |
| POST | `/{id}/cancel/` | Claimant | Cancel claim |
| POST | `/{id}/upload-id/` | Claimant | Upload govt ID photo for high-value items |
| POST | `/{id}/verify-id/` | Staff/Admin | Mark uploaded ID as verified |
| GET | `/disputes/` | Admin | List found items with 2+ competing active claims |
| POST | `/disputes/{found_item_id}/resolve/` | Admin | Approve winner, auto-reject others |
| GET | `/slots/` | JWT | List pickup slots |
| POST | `/slots/` | Staff/Admin | Create pickup slot |

**High-value categories triggering ID verification:** phone, electronics, jewelry, wallet

### Notifications  `/api/v1/notifications/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | List last 50 notifications + unread count |
| POST | `/mark-read/` | JWT | Mark all (or specific IDs) as read |

**Notification types:** `match_found` · `claim_update` · `new_claim` (staff) · `system`

### Chat  `/api/v1/chat/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/rooms/` | JWT | List all accessible chat rooms |
| GET/POST | `/claim/{claim_id}/` | JWT | Get or auto-create chat room for a claim |
| GET | `/room/{room_id}/messages/` | JWT | Message history (50 per page, `?before=<id>`) |
| GET | `/room/{room_id}/presence/` | JWT | List online user IDs for the room |

### Analytics  `/api/v1/analytics/`  *(Admin only)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/overview/?days=30` | Aggregate counts: items, claims, avg resolution time, match rate |
| GET | `/daily/?days=30` | Per-day breakdown for found items, lost items, and claims |

### Admin Panel  `/api/v1/admin/`  *(Admin role required for all)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stats/` | Platform counts + breakdowns |
| GET | `/users/` | All users (search, role/active/verified filter) |
| GET/PATCH/DELETE | `/users/{id}/` | User detail / update / delete |
| GET/POST | `/venues/` | List / create venues |
| GET | `/venues/types/` | Venue type options |
| GET/PATCH/DELETE | `/venues/{slug}/` | Venue detail / update / delete |
| POST | `/venues/{slug}/activate/` | Activate |
| POST | `/venues/{slug}/deactivate/` | Deactivate |
| GET | `/found-items/` | All found items (venue_id, category, status filter) |
| GET/PATCH | `/found-items/{id}/` | Detail / update status |
| GET | `/lost-items/` | All lost items |
| GET | `/lost-items/{id}/` | Lost item detail |
| GET | `/claims/` | All claims (status filter) |
| GET | `/claims/{id}/` | Claim detail |
| POST | `/claims/{id}/review/` | Approve / reject |
| POST | `/claims/{id}/complete/` | Complete |
| POST | `/claims/{id}/cancel/` | Cancel |

### WebSocket

**Notifications** — real-time events
```
ws://localhost:8000/ws/notifications/?token=<access_token>

Events pushed by server:
  { "type": "match",        "item_id": "...", "item_type": "lost", "match_count": 3 }
  { "type": "claim_status", "claim_id": 42,   "status": "approved" }
  { "type": "new_claim",    "claim_id": 42,   "venue_id": 7 }

Close code 4001 = invalid token (client should not reconnect)
```

**Chat** — per-claim messaging
```
ws://localhost:8000/ws/chat/<room_id>/?token=<access_token>

Send:    { "type": "chat_message", "text": "Hello!" }

Receive: { "type": "chat_message", "room_id": 1, "claim_id": 42,
           "sender_id": 5, "sender_name": "Jane", "text": "Hello!",
           "created_at": "2026-10-17T10:00:00Z" }
         { "type": "presence", "user_id": 5, "online": true }

Close code 4001 = invalid token
```

---

## 7. Environment Variables

File: `backend/.env`

```env
# Django
SECRET_KEY=<your-secret-key>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# PostgreSQL
DB_NAME=lostfound_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db                          # Docker service name (not localhost)
DB_PORT=5432

# MongoDB
MONGO_URI=mongodb://mongo:27017/    # Docker service name
MONGO_DB_NAME=lostfound_items

# Redis
REDIS_URL=redis://redis:6379/0      # Docker service name

# Elasticsearch
ELASTICSEARCH_HOST=http://elasticsearch:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme

# AWS S3 (image storage — use local in dev)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=lostfound-media
AWS_S3_REGION_NAME=ap-south-1

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

> **Important:** All hostnames use Docker Compose service names (`db`, `mongo`, `redis`, `elasticsearch`) — not `localhost`. Running `docker-compose restart` does **not** reload env_file; use `--force-recreate` after editing `.env`.

---

## 8. Getting Started

### Prerequisites

- Docker Desktop 4.x
- Node.js 20+
- npm 10+

### First-time setup

```bash
# 1. Clone and enter
git clone <repo-url>
cd City-wide-lost-and-found-network-with-image-matching

# 2. Start all backend services
docker-compose up -d

# 3. Wait ~10 s for healthchecks, then seed the database
docker-compose exec backend python manage.py migrate        # already run on start
docker-compose exec backend python manage.py create_defaults  # creates default accounts

# 4. Install frontend dependencies
cd frontend && npm install && cd ..

# 5. Install admin panel dependencies
cd admin && npm install && cd ..
```

---

## 9. Running the Project

### Start everything

**Terminal 1 — Backend (Docker)**
```bash
docker-compose up -d
# Backend:        http://localhost:8000
# Swagger UI:     http://localhost:8000/api/docs/
# Django admin:   http://localhost:8000/admin/
```

**Terminal 2 — User Frontend**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

**Terminal 3 — Admin Panel**
```bash
cd admin
npm run dev
# → http://localhost:3001
```

### Docker services overview

| Service | Container port | Host port | Description |
|---|---|---|---|
| backend | 8000 | 8000 | Django ASGI (HTTP + WebSocket) |
| celery | — | — | Celery worker (CLIP embeddings) |
| celery-beat | — | — | Periodic task scheduler |
| db | 5432 | 5432 | PostgreSQL 15 |
| mongo | 27017 | 27017 | MongoDB |
| redis | 6379 | 6379 | Redis (cache + broker) |
| elasticsearch | 9200 | 9200 | Elasticsearch 8 |

### Useful commands

```bash
# View backend logs
docker-compose logs -f backend

# Run Django management commands
docker-compose exec backend python manage.py <command>

# Open Django shell
docker-compose exec backend python manage.py shell

# Reset & re-run migrations
docker-compose exec backend python manage.py migrate --run-syncdb

# Re-seed default accounts
docker-compose exec backend python manage.py create_defaults

# Rebuild after code changes to requirements.txt
docker-compose up -d --build backend
```

---

## 10. Default Accounts

> Created by `python manage.py create_defaults`

| Role | Email | Password | App |
|---|---|---|---|
| **Admin** | `admin@lostandfound.com` | `admin@123` | Admin Panel — `http://localhost:3001` |
| **Owner (User)** | `user@lostandfound.com` | `user@123` | User App — `http://localhost:3000` |

**Admin** can access the admin panel and all API endpoints.  
**Owner** can report lost items, search for matches, submit claims.  

To create a **Venue Staff** account, register a new user via the API/user app, then promote them in the admin panel (`/users`) by changing their role to `venue_staff` and assigning a venue.

---

## 11. Frontend — User App

**URL:** `http://localhost:3000`

| Route | Page | Who |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Dashboard overview | All roles |
| `/items/found` | Browse found items | All |
| `/items/found/new` | Upload found item | Venue Staff / Admin |
| `/items/found/:id` | Found item detail | All |
| `/items/lost` | My lost items | Owner |
| `/items/lost/new` | Report lost item | Owner |
| `/items/lost/:id` | Lost item detail | Owner |
| `/search` | AI image + text search | All |
| `/claims` | My claims | Role-scoped |
| `/claims/new` | Submit claim | Owner |
| `/claims/:id` | Claim detail | Role-scoped |
| `/notifications` | Notification centre | All |

**Role-based access:**
- Routes are protected by `<ProtectedRoute allowedRoles={[...]} />`
- Unauthenticated users → `/login`
- Wrong role → `/dashboard`

---

## 12. Admin Panel

**URL:** `http://localhost:3001`  
**Access:** Only users with `role = admin` can log in. Non-admin tokens are rejected at the login page.

| Route | Page | Features |
|---|---|---|
| `/login` | Admin Login | Role-checked; rejects non-admins |
| `/dashboard` | Dashboard | 5 stat tiles + 3 breakdown cards |
| `/users` | Users List | Search, role/status filter, inline role editor, activate/verify toggles |
| `/users/:id` | User Detail | Change role, venue, active/verified status, delete |
| `/venues` | Venues List | Search, type/status filter, create / edit / activate / delete |
| `/venues/new` | Create Venue | Full form with zod validation |
| `/venues/:slug/edit` | Edit Venue | Pre-filled form |
| `/found-items` | Found Items | All items across all venues; inline status editor |
| `/lost-items` | Lost Items | All lost items with category/status filters |
| `/claims` | Claims List | Status filter; click to open detail |
| `/claims/:id` | Claim Detail | Approve / Reject / Complete / Cancel + proof description |

**Auth persistence:** Session is stored in `localStorage` via Zustand `persist`. Refresh token is rotated automatically on 401.

---

## 13. Real-time (WebSocket)

Django Channels + Redis channel layer powers two WebSocket endpoints.

### Notification WS  `ws://localhost:8000/ws/notifications/`

```
User connects → ws://localhost:8000/ws/notifications/?token=<jwt>
                  │
                  ▼
          NotificationConsumer.connect()
          • JWT token validated
          • Added to personal group:  "user_<id>"
          • If venue staff: also added to "venue_<id>"

Server pushes → channel_layer.group_send("venue_42", {...})
                  │
                  ▼
          All staff connected to that venue receive the event
```

Events: new claim submitted · claim status updated · AI match found

### Chat WS  `ws://localhost:8000/ws/chat/<room_id>/`

```
User connects → ws://localhost:8000/ws/chat/5/?token=<jwt>
                  │
                  ▼
          ChatConsumer.connect()
          • JWT token validated
          • Access checked (claimant / venue staff / admin)
          • User ID added to Redis presence set  "chat_online:<room_id>"
          • Joined channel group  "chat_5"

Send text message:
  { "type": "chat_message", "text": "Is the wallet still there?" }

Receive from server:
  { "type": "chat_message", "room_id": 5, "claim_id": 42,
    "sender_id": 7, "sender_name": "Alice", "text": "...", "created_at": "..." }
  { "type": "presence", "user_id": 7, "online": true }

On disconnect → user removed from presence set, peers notified
```

---

## 14. AI Matching Pipeline

1. **Item upload** → image saved to S3 (or `/media/` in dev)
2. **Celery task** `generate_embedding(item_id, item_type)` queued
3. **CLIP model** encodes image → 512-dim vector; encodes title+description → 512-dim vector
4. **Elasticsearch** document indexed with both vectors
5. **Search query** → user uploads image or types description
6. **kNN search** on image_embedding (70% weight) + BM25 text (30% weight)
7. **Threshold filter** → only results with `score > 0.3` returned
8. Results include `match_score`, `item_id`, full item metadata

---

## 15. Postman Collection

File: `LostAndFound.postman_collection.json` (project root)

**Import:** Open Postman → Import → select the JSON file.

**Collection variables** (set automatically by test scripts):

| Variable | Set by |
|---|---|
| `baseUrl` | Pre-set to `http://localhost:8000` |
| `accessToken` | Login / Register request |
| `refreshToken` | Login / Register request |
| `venueSlug` | Create Venue request |
| `foundItemId` | Upload Found Item request |
| `lostItemId` | Report Lost Item request |
| `claimId` | Submit Claim request |
| `slotId` | Create Pickup Slot request |
| `roomId` | Get / Create Chat Room request |

**Folders:** Authentication (6) · Venues (10) · Found Items (4) · Lost Items (5) · AI Matching (4) · Claims (13) · Notifications (2) · Chat (4) · Analytics (2) · System (3) · WebSocket info (2)

---

## 16. Swagger Docs

Available only when `DEBUG=True`:

| URL | Description |
|---|---|
| `http://localhost:8000/api/docs/` | Swagger UI — interactive API explorer |
| `http://localhost:8000/api/schema/` | Raw OpenAPI 3.0 JSON schema |

All endpoints are decorated with `@extend_schema` tags:
`Authentication` · `Venues` · `Items` · `AI Matching` · `Claims` · `Admin`
