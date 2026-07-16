# SpeedDate BR — Design Spec (MVP)

**Date:** 2026-07-16  
**Status:** Draft for user review  
**Working name:** SpeedDate BR (placeholder)  
**Process:** Superpowers brainstorming → approved design sections

---

## 1. Problem and product

### Problem
People want structured, low-pressure ways to meet singles in person. Classic **speed dating** (fixed tables, timed rounds, interest voting at the end) is popular in the US and under-served as a productized experience in Brazil.

### Product (MVP)
A **mobile-first web platform** to **organize and sell speed dating events**:

- Online registration and paid tickets (Pix / card)
- On-site hybrid flow: conversation rounds offline; interest voting via QR/link on the phone
- Mutual matches release contact info (WhatsApp and/or Instagram)
- Optional “who liked me” list (non-mutual interest visibility)
- Single operator (our organization) now; data model ready for multi-organizer later

### Explicit non-goals (MVP)
- Multi-organizer self-service marketplace
- Travel matching product
- In-app chat
- Table-round timer inside the app
- Native iOS/Android apps
- LGBTQ+ / themed / age-band event formats as first-class product (classic hetero only)
- Heavy identity verification / moderation suite

### Later phases (roadmap only)
1. Multi-organizer + payouts  
2. Monetize “who liked me” as upsell  
3. **Travel** product reusing the same user base  
4. Live round timer, chat, native apps  

---

## 2. Decisions (locked)

| Topic | Decision |
|-------|----------|
| Core product | Event operations + ticket sales + night voting + matching |
| Operators | Single org now; `organization_id` on all business entities |
| Night experience | Hybrid: offline rounds; phone voting via QR/link |
| Matching | Mutual matches highlighted; “who liked me” available |
| Match reveal timing | After admin **closes** voting |
| Payment | Online tickets — Pix and/or card via **Mercado Pago** |
| Market | Brazil — pt-BR, BRL |
| Event format | Classic hetero: women fixed at tables, men rotate (operations offline) |
| Post-match | Reveal WhatsApp and/or Instagram |
| Registration | Minimum fields only |
| Architecture approach | Full-stack web (Next.js + Postgres + Mercado Pago) |

---

## 3. Roles

| Role | Description |
|------|-------------|
| **Participant** | Registers, buys ticket, checks in, votes, sees matches/contacts |
| **Admin** | Belongs to the single organization; manages events, check-in, voting window, sees matches |
| **System** | Payments webhooks, match computation, authorization |

---

## 4. User flows

### 4.1 Happy path — participant
1. Browse published events on landing / event list  
2. Open event detail (date, venue, price, remaining spots by gender)  
3. Sign up or log in (minimum profile)  
4. Purchase ticket → Mercado Pago (Pix/card)  
5. Webhook marks ticket `paid`  
6. At venue: staff check-in  
7. Offline timed conversation rounds (organizer-run)  
8. Admin opens voting → participant scans QR / opens link  
9. Participant votes yes/no on checked-in people of the other gender  
10. Admin closes voting → mutual matches show contacts; “who liked me” list available  

### 4.2 Happy path — admin
1. Create/publish event (capacities by gender, price, venue, time)  
2. Monitor paid tickets  
3. Check-in attendees at door  
4. Open voting when rounds end  
5. Close voting → review matches  

### 4.3 Capacity
- Separate capacity for men and women (`capacity_men`, `capacity_women`)  
- Purchase blocked when that gender’s paid (or held) slots are full  
- Race at checkout: reject or refund if capacity exceeded  

---

## 5. Architecture

```
[Participant mobile web]     [Admin desktop/tablet]
         |                              |
         v                              v
              Next.js (App Router, TypeScript)
           UI + Server Actions / API Routes
                    |
     +--------------+--------------+
     |              |              |
  PostgreSQL    Mercado Pago      Auth
  (source of    (Pix / card)   (session)
   truth)
```

| Layer | Choice | Notes |
|-------|--------|--------|
| App | Next.js App Router + TypeScript | Public site + participant area + admin |
| DB | PostgreSQL (e.g. Supabase or Neon) | Relational model for events/votes/matches |
| Auth | Email + password (or magic link) | Phone/WhatsApp stored on profile |
| Payments | Mercado Pago Preferences + webhooks | Idempotent by payment id |
| Hosting | Vercel + managed Postgres | Simple deploy for MVP |
| Locale | pt-BR / BRL | Single market |

### Multi-tenant readiness
- `organization_id` on events and admin membership  
- MVP seeds one default organization  
- No multi-org UI, billing, or onboarding in MVP  

---

## 6. Data model

### Organization
- `id`, `name`, `slug`, timestamps  

### User
- `id`, `email`, `password_hash` (or auth provider id)  
- `name`, `phone` (WhatsApp), `gender` (`male` \| `female` for MVP format)  
- `birth_date`, `photo_url` (optional), `instagram` (optional)  
- `role` (`participant` \| `admin`)  
- Must be **≥ 18** years old to register/purchase  

### Event
- `organization_id`, `title`, `slug`  
- `venue`, `address`, `city`  
- `starts_at`, `ends_at`  
- `capacity_men`, `capacity_women`  
- `price_cents`, `currency` (`BRL`)  
- `status`: `draft` \| `published` \| `sold_out` \| `live` \| `closed`  

### Ticket
- `event_id`, `user_id`  
- `status`: `pending` \| `paid` \| `cancelled` \| `refunded`  
- `mp_payment_id` (unique, nullable until paid)  
- `checked_in_at` (nullable)  
- Constraint: one active paid ticket per user per event (enforce in app + DB unique where appropriate)  

### EventSession (voting night)
- `event_id`  
- `status`: `not_started` \| `voting_open` \| `voting_closed`  
- `voting_opens_at`, `voting_closes_at` (nullable until set)  

### Vote
- `session_id`, `from_user_id`, `to_user_id`  
- `interest`: `yes` \| `no`  
- Unique `(session_id, from_user_id, to_user_id)`  
- User may **change vote until session is closed**  

### Match
- `session_id`, `user_a_id`, `user_b_id` (canonical order: lower uuid first)  
- Created only when both directions are `yes`  
- Unique pair per session  

### Encounter (optional v1)
- Not required if voting list = all checked-in opposite gender  
- MVP uses: **all checked-in participants of the opposite gender** as the ballot  

---

## 7. Matching and privacy rules

1. **Eligible voters:** ticket `paid` + `checked_in_at` set + session `voting_open`  
2. **Ballot:** all checked-in users of the opposite gender for that event  
3. **Mutual match:** A→B `yes` and B→A `yes` → create `Match`  
4. **Contact release:** only on mutual match, after voting is **closed**, show the other person’s WhatsApp and Instagram (if set)  
5. **Who liked me:** all `Vote` rows where `to_user_id = me` and `interest = yes` (includes non-mutual); visible after voting closed for eligible participants  
6. **WhatsApp required before voting:** user must have phone/WhatsApp filled before submitting votes (so matches always have a contact path)  
7. **Instagram optional** on profile; shown if present  

---

## 8. Payments

1. User starts checkout → create `Ticket` with `pending`  
2. Create Mercado Pago Preference (external reference = ticket id)  
3. User pays Pix or card on MP  
4. Webhook (`payment.updated` / approved) → verify signature/secret → set ticket `paid` (idempotent)  
5. Failure/expiry → ticket remains `pending` or moves to `cancelled` per timeout policy  
6. UI states: success, pending (Pix), failure  

**Security:** never trust client-side “paid” flags; only webhook (or server-side MP API verify).

---

## 9. Screens (routes)

### Public
| Route | Purpose |
|-------|---------|
| `/` | Landing + next events |
| `/eventos` | Event list |
| `/eventos/[slug]` | Event detail + buy CTA |
| `/login`, `/cadastro` | Auth + minimum signup |
| `/pagamento/sucesso`, `/pagamento/pendente` | Post-checkout feedback |

### Participant
| Route | Purpose |
|-------|---------|
| `/minha-conta` | Profile (WhatsApp, Instagram, optional photo) |
| `/meus-ingressos` | Tickets + check-in status |
| `/evento/[id]/votar` | Ballot |
| `/evento/[id]/matches` | Mutual matches + contacts |
| `/evento/[id]/curtidas` | Who liked me |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/eventos` | Event CRUD |
| `/admin/eventos/[id]` | Roster, check-in, open/close voting |
| `/admin/eventos/[id]/matches` | Night matches overview |

**On-site QR:** points to `/evento/[id]/votar` (auth + eligibility enforced server-side).

---

## 10. Authorization matrix

| Action | Requirements |
|--------|----------------|
| Buy ticket | Authenticated, ≥18, gender capacity available, event `published` |
| Vote | Paid ticket, checked in, session `voting_open`, WhatsApp on profile |
| View matches / who liked me | Paid + checked in + session `voting_closed` |
| Admin routes | `role = admin` and same organization |

---

## 11. Error handling

| Situation | Behavior |
|-----------|----------|
| Pix pending | Show pending; ticket stays `pending` until webhook |
| Payment failed/expired | Allow retry; do not grant access |
| Sold out mid-checkout | Do not confirm ticket; refund if charged |
| Not checked in | Block voting with clear message |
| Voting closed | Block new votes; show results if eligible |
| Duplicate vote | Upsert; last value wins until close |
| Under 18 | Block registration/purchase |
| Invalid MP webhook | Log; no ticket mutation |
| Missing WhatsApp at vote time | Force profile completion first |

---

## 12. Testing strategy

1. **Unit:** mutual match function; capacity by gender; age ≥ 18  
2. **Integration:** event → pay (MP mock) → check-in → votes → close → matches + contacts  
3. **Webhook:** approved payment idempotent; rejected does not unlock  
4. **AuthZ:** participant cannot access admin; no check-in cannot vote  
5. **E2E smoke:** full night path with two opposite-gender users  

---

## 13. Minimum registration fields

Required:
- Name  
- Email  
- Password (or magic link equivalent)  
- Phone / WhatsApp  
- Gender  
- Birth date  

Optional:
- Photo  
- Instagram (recommended before event night, required only for display on match if set)  

---

## 14. Success criteria (MVP)

- Admin can publish a paid event with gendered capacity  
- Participant can pay with Pix or card and receive a confirmed ticket  
- Check-in gates voting  
- Mutual yes/yes produces match and reveals contacts after close  
- “Who liked me” lists non-mutual interest after close  
- Schema supports future `organization` expansion and future travel product via shared `User`  

---

## 15. Open items (resolved for build)

| Item | Resolution |
|------|------------|
| Product name | Placeholder SpeedDate BR — rename anytime |
| Vote list source | All checked-in opposite gender (no Encounter table required in v1) |
| Match timing | After admin closes voting |
| Who liked me pricing | Free in MVP; upsell later |
| Auth method | Email + password acceptable; magic link optional enhancement |

No intentional TBDs remaining for MVP implementation planning.

---

## 16. Spec self-review (2026-07-16)

- [x] No TBD/TODO placeholders left for MVP scope  
- [x] Architecture matches features (hybrid night, MP, single org)  
- [x] Scope is one implementation plan (event platform MVP only)  
- [x] Ambiguities resolved: ballot set, reveal timing, contact fields, capacity  

---

## Approval

- Design sections approved in conversation (product, architecture, screens/errors/tests)  
- **Next gate:** user review of this file → then Superpowers `writing-plans` for implementation plan  
