# SpeedDate BR MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web platform (pt-BR) to sell speed dating event tickets, run on-site check-in and phone voting, compute mutual matches, and reveal WhatsApp/Instagram contacts.

**Architecture:** Next.js App Router (TypeScript) monolith with Prisma/PostgreSQL, Auth.js credentials, Mercado Pago Preferences + webhooks. Single seeded Organization; all business rows carry `organizationId` for future multi-tenant. Domain logic (age, capacity, matching) lives in pure functions under `src/lib/domain/` and is TDD’d first.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6, PostgreSQL, Auth.js (NextAuth v5), Mercado Pago SDK, Tailwind CSS 4, Vitest, Playwright, Zod

**Spec:** `docs/superpowers/specs/2026-07-16-speed-dating-design.md`

---

## File map (create)

```
package.json
tsconfig.json
next.config.ts
vitest.config.ts
playwright.config.ts
.env.example
prisma/schema.prisma
prisma/seed.ts
src/app/layout.tsx
src/app/globals.css
src/app/page.tsx
src/app/(public)/eventos/page.tsx
src/app/(public)/eventos/[slug]/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/cadastro/page.tsx
src/app/(participant)/minha-conta/page.tsx
src/app/(participant)/meus-ingressos/page.tsx
src/app/(participant)/evento/[id]/votar/page.tsx
src/app/(participant)/evento/[id]/matches/page.tsx
src/app/(participant)/evento/[id]/curtidas/page.tsx
src/app/(admin)/admin/page.tsx
src/app/(admin)/admin/eventos/page.tsx
src/app/(admin)/admin/eventos/novo/page.tsx
src/app/(admin)/admin/eventos/[id]/page.tsx
src/app/(admin)/admin/eventos/[id]/matches/page.tsx
src/app/pagamento/sucesso/page.tsx
src/app/pagamento/pendente/page.tsx
src/app/api/auth/[...nextauth]/route.ts
src/app/api/webhooks/mercadopago/route.ts
src/app/api/checkout/route.ts
src/lib/prisma.ts
src/lib/auth.ts
src/lib/auth.config.ts
src/lib/mercadopago.ts
src/lib/domain/age.ts
src/lib/domain/capacity.ts
src/lib/domain/matching.ts
src/lib/domain/eligibility.ts
src/lib/actions/events.ts
src/lib/actions/tickets.ts
src/lib/actions/voting.ts
src/lib/actions/admin.ts
src/lib/actions/profile.ts
src/lib/validations/auth.ts
src/lib/validations/event.ts
src/components/ui/button.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/layout/header.tsx
src/components/events/event-card.tsx
src/components/events/event-form.tsx
src/components/voting/ballot-list.tsx
src/components/admin/checkin-list.tsx
src/middleware.ts
tests/unit/age.test.ts
tests/unit/capacity.test.ts
tests/unit/matching.test.ts
tests/unit/eligibility.test.ts
tests/integration/night-flow.test.ts
e2e/smoke-night.spec.ts
```

---

### Task 1: Scaffold Next.js project + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js app in project root**

Run from `C:\Users\User\Documents\Nova pasta` (keep existing `docs/` and `.git`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

If create-next-app refuses non-empty dir, scaffold in temp and move files, or use:

```bash
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

**Preferred:** keep app at repo root (not `/web`) so paths match this plan. Move `docs` aside only if required, then restore.

Expected: `package.json` with `next`, `react`, `react-dom`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client zod bcryptjs next-auth@beta @auth/prisma-adapter mercadopago date-fns
npm install -D prisma vitest @vitejs/plugin-react jsdom @types/bcryptjs @playwright/test tsx
```

- [ ] **Step 3: Add scripts and Vitest config**

`package.json` scripts (merge with existing):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/speeddate?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
MERCADOPAGO_ACCESS_TOKEN="TEST-xxx"
MERCADOPAGO_WEBHOOK_SECRET="whsec-xxx"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts .env.example src
git commit -m "chore: scaffold Next.js app with Vitest and env example"
```

---

### Task 2: Domain pure functions (TDD) — age, capacity, matching, eligibility

**Files:**
- Create: `src/lib/domain/age.ts`, `capacity.ts`, `matching.ts`, `eligibility.ts`
- Test: `tests/unit/age.test.ts`, `capacity.test.ts`, `matching.test.ts`, `eligibility.test.ts`

- [ ] **Step 1: Write failing age tests**

Create `tests/unit/age.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAtLeast18, yearsOldOn } from "@/lib/domain/age";

describe("age", () => {
  it("returns true when person is 18 on reference date", () => {
    expect(isAtLeast18(new Date("2006-07-16"), new Date("2024-07-16"))).toBe(true);
  });

  it("returns false when person turns 18 tomorrow", () => {
    expect(isAtLeast18(new Date("2006-07-17"), new Date("2024-07-16"))).toBe(false);
  });

  it("computes years old", () => {
    expect(yearsOldOn(new Date("1990-01-01"), new Date("2026-01-01"))).toBe(36);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/unit/age.test.ts
```

Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Implement age**

Create `src/lib/domain/age.ts`:

```ts
export function yearsOldOn(birthDate: Date, on: Date): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const m = on.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeast18(birthDate: Date, on: Date = new Date()): boolean {
  return yearsOldOn(birthDate, on) >= 18;
}
```

- [ ] **Step 4: Run age tests — expect PASS**

```bash
npx vitest run tests/unit/age.test.ts
```

- [ ] **Step 5: Write failing capacity tests**

Create `tests/unit/capacity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canSellTicket, remainingSpots } from "@/lib/domain/capacity";

describe("capacity", () => {
  const event = { capacityMen: 10, capacityWomen: 10 };

  it("allows sale when spots remain for gender", () => {
    expect(
      canSellTicket(event, "male", { paidMen: 9, paidWomen: 10, pendingMen: 0, pendingWomen: 0 })
    ).toBe(true);
  });

  it("blocks sale when paid+pending fills capacity", () => {
    expect(
      canSellTicket(event, "male", { paidMen: 9, paidWomen: 0, pendingMen: 1, pendingWomen: 0 })
    ).toBe(false);
  });

  it("computes remaining", () => {
    expect(
      remainingSpots(event, "female", { paidMen: 0, paidWomen: 3, pendingMen: 0, pendingWomen: 1 })
    ).toBe(6);
  });
});
```

- [ ] **Step 6: Implement capacity**

Create `src/lib/domain/capacity.ts`:

```ts
export type Gender = "male" | "female";

export type CapacityEvent = {
  capacityMen: number;
  capacityWomen: number;
};

export type Occupancy = {
  paidMen: number;
  paidWomen: number;
  pendingMen: number;
  pendingWomen: number;
};

export function remainingSpots(
  event: CapacityEvent,
  gender: Gender,
  occ: Occupancy
): number {
  if (gender === "male") {
    return event.capacityMen - occ.paidMen - occ.pendingMen;
  }
  return event.capacityWomen - occ.paidWomen - occ.pendingWomen;
}

export function canSellTicket(
  event: CapacityEvent,
  gender: Gender,
  occ: Occupancy
): boolean {
  return remainingSpots(event, gender, occ) > 0;
}
```

- [ ] **Step 7: Write failing matching tests**

Create `tests/unit/matching.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeMutualMatches, type VoteInput } from "@/lib/domain/matching";

describe("matching", () => {
  it("creates match only when both said yes", () => {
    const votes: VoteInput[] = [
      { fromUserId: "a", toUserId: "b", interest: "yes" },
      { fromUserId: "b", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "c", interest: "yes" },
      { fromUserId: "c", toUserId: "a", interest: "no" },
    ];
    const matches = computeMutualMatches(votes);
    expect(matches).toEqual([{ userAId: "a", userBId: "b" }]);
  });

  it("canonicalizes pair order lexicographically", () => {
    const votes: VoteInput[] = [
      { fromUserId: "z", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "z", interest: "yes" },
    ];
    expect(computeMutualMatches(votes)[0]).toEqual({ userAId: "a", userBId: "z" });
  });

  it("dedupes pairs", () => {
    const votes: VoteInput[] = [
      { fromUserId: "a", toUserId: "b", interest: "yes" },
      { fromUserId: "b", toUserId: "a", interest: "yes" },
      { fromUserId: "a", toUserId: "b", interest: "yes" },
    ];
    expect(computeMutualMatches(votes)).toHaveLength(1);
  });
});
```

- [ ] **Step 8: Implement matching**

Create `src/lib/domain/matching.ts`:

```ts
export type VoteInput = {
  fromUserId: string;
  toUserId: string;
  interest: "yes" | "no";
};

export type MatchPair = { userAId: string; userBId: string };

function pairKey(a: string, b: string): MatchPair {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export function computeMutualMatches(votes: VoteInput[]): MatchPair[] {
  const yes = new Set<string>();
  for (const v of votes) {
    if (v.interest === "yes") {
      yes.add(`${v.fromUserId}->${v.toUserId}`);
    }
  }
  const out: MatchPair[] = [];
  const seen = new Set<string>();
  for (const v of votes) {
    if (v.interest !== "yes") continue;
    const back = `${v.toUserId}->${v.fromUserId}`;
    if (!yes.has(back)) continue;
    const p = pairKey(v.fromUserId, v.toUserId);
    const k = `${p.userAId}|${p.userBId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function whoLikedMe(votes: VoteInput[], me: string): string[] {
  return votes
    .filter((v) => v.toUserId === me && v.interest === "yes")
    .map((v) => v.fromUserId);
}
```

- [ ] **Step 9: Write failing eligibility tests + implement**

Create `tests/unit/eligibility.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  canVote,
  canViewResults,
  oppositeGender,
} from "@/lib/domain/eligibility";

describe("eligibility", () => {
  it("opposite gender", () => {
    expect(oppositeGender("male")).toBe("female");
    expect(oppositeGender("female")).toBe("male");
  });

  it("can vote only paid + checked in + voting open + whatsapp", () => {
    expect(
      canVote({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_open",
        hasWhatsapp: true,
      })
    ).toBe(true);
    expect(
      canVote({
        ticketStatus: "paid",
        checkedIn: false,
        sessionStatus: "voting_open",
        hasWhatsapp: true,
      })
    ).toBe(false);
  });

  it("can view results only after voting closed", () => {
    expect(
      canViewResults({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_closed",
      })
    ).toBe(true);
    expect(
      canViewResults({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_open",
      })
    ).toBe(false);
  });
});
```

Create `src/lib/domain/eligibility.ts`:

```ts
import type { Gender } from "./capacity";

export function oppositeGender(g: Gender): Gender {
  return g === "male" ? "female" : "male";
}

export function canVote(input: {
  ticketStatus: string;
  checkedIn: boolean;
  sessionStatus: string;
  hasWhatsapp: boolean;
}): boolean {
  return (
    input.ticketStatus === "paid" &&
    input.checkedIn &&
    input.sessionStatus === "voting_open" &&
    input.hasWhatsapp
  );
}

export function canViewResults(input: {
  ticketStatus: string;
  checkedIn: boolean;
  sessionStatus: string;
}): boolean {
  return (
    input.ticketStatus === "paid" &&
    input.checkedIn &&
    input.sessionStatus === "voting_closed"
  );
}
```

- [ ] **Step 10: Run all unit tests**

```bash
npx vitest run tests/unit
```

Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/domain tests/unit
git commit -m "feat: domain rules for age, capacity, matching, eligibility"
```

---

### Task 3: Prisma schema + seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write full schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  participant
  admin
}

enum Gender {
  male
  female
}

enum EventStatus {
  draft
  published
  sold_out
  live
  closed
}

enum TicketStatus {
  pending
  paid
  cancelled
  refunded
}

enum SessionStatus {
  not_started
  voting_open
  voting_closed
}

enum Interest {
  yes
  no
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  events    Event[]
  members   OrganizationMember[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
  createdAt      DateTime     @default(now())

  @@unique([organizationId, userId])
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  phone        String
  gender       Gender
  birthDate    DateTime
  photoUrl     String?
  instagram    String?
  role         Role      @default(participant)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  tickets      Ticket[]
  votesFrom    Vote[]    @relation("VotesFrom")
  votesTo      Vote[]    @relation("VotesTo")
  memberships  OrganizationMember[]
}

model Event {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  title          String
  slug           String       @unique
  venue          String
  address        String
  city           String
  startsAt       DateTime
  endsAt         DateTime
  capacityMen    Int
  capacityWomen  Int
  priceCents     Int
  currency       String       @default("BRL")
  status         EventStatus  @default(draft)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  tickets        Ticket[]
  session        EventSession?
}

model Ticket {
  id          String       @id @default(cuid())
  eventId     String
  userId      String
  event       Event        @relation(fields: [eventId], references: [id])
  user        User         @relation(fields: [userId], references: [id])
  status      TicketStatus @default(pending)
  mpPaymentId String?      @unique
  checkedInAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([eventId, status])
  @@index([userId])
}

model EventSession {
  id            String        @id @default(cuid())
  eventId       String        @unique
  event         Event         @relation(fields: [eventId], references: [id])
  status        SessionStatus @default(not_started)
  votingOpensAt DateTime?
  votingClosesAt DateTime?
  votes         Vote[]
  matches       Match[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Vote {
  id         String       @id @default(cuid())
  sessionId  String
  fromUserId String
  toUserId   String
  interest   Interest
  session    EventSession @relation(fields: [sessionId], references: [id])
  fromUser   User         @relation("VotesFrom", fields: [fromUserId], references: [id])
  toUser     User         @relation("VotesTo", fields: [toUserId], references: [id])
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@unique([sessionId, fromUserId, toUserId])
}

model Match {
  id        String       @id @default(cuid())
  sessionId String
  userAId   String
  userBId   String
  session   EventSession @relation(fields: [sessionId], references: [id])
  createdAt DateTime     @default(now())

  @@unique([sessionId, userAId, userBId])
}
```

- [ ] **Step 3: Prisma client singleton**

Create `src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Seed default org + admin**

Create `prisma/seed.ts`:

```ts
import { PrismaClient, Role, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "speeddate-br" },
    update: {},
    create: {
      name: "SpeedDate BR",
      slug: "speeddate-br",
    },
  });

  const passwordHash = await bcrypt.hash("admin123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@speeddate.local" },
    update: {},
    create: {
      email: "admin@speeddate.local",
      passwordHash,
      name: "Admin",
      phone: "11999999999",
      gender: Gender.male,
      birthDate: new Date("1990-01-01"),
      role: Role.admin,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: admin.id,
    },
  });

  console.log("Seeded org", org.slug, "admin", admin.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 5: Push schema and seed**

Ensure Postgres is running and `DATABASE_URL` is set in `.env`, then:

```bash
npx prisma db push
npm run db:seed
```

Expected: tables created; seed logs admin email.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/prisma.ts
git commit -m "feat: prisma schema multi-tenant ready with seed admin"
```

---

### Task 4: Auth (register, login, session, middleware)

**Files:**
- Create: `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/validations/auth.ts`, `src/lib/actions/profile.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/cadastro/page.tsx`, `src/middleware.ts`

- [ ] **Step 1: Zod schemas**

Create `src/lib/validations/auth.ts`:

```ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().min(10).max(20),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  instagram: z.string().max(100).optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
});
```

- [ ] **Step 2: Auth.js setup**

Create `src/lib/auth.config.ts`:

```ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = path.startsWith("/admin");
      const isProtected =
        path.startsWith("/minha-conta") ||
        path.startsWith("/meus-ingressos") ||
        path.startsWith("/evento/") ||
        isAdminRoute;

      if (isProtected && !isLoggedIn) return false;
      if (isAdminRoute && auth?.user?.role !== "admin") return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
```

Create `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

Create `src/types/next-auth.d.ts`:

```ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

- [ ] **Step 3: Register server action**

Create `src/lib/actions/profile.ts` (register + update):

```ts
"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, profileUpdateSchema } from "@/lib/validations/auth";
import { isAtLeast18 } from "@/lib/domain/age";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const birth = new Date(parsed.data.birthDate + "T12:00:00");
  if (!isAtLeast18(birth)) {
    return { ok: false, error: "É necessário ter 18 anos ou mais." };
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "E-mail já cadastrado." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
      birthDate: birth,
    },
  });

  return { ok: true };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    instagram: formData.get("instagram") || "",
    photoUrl: formData.get("photoUrl") || "",
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      instagram: parsed.data.instagram || null,
      photoUrl: parsed.data.photoUrl || null,
    },
  });
  revalidatePath("/minha-conta");
  return { ok: true };
}
```

- [ ] **Step 4: Login and cadastro pages (minimal UI)**

Create `src/app/(auth)/cadastro/page.tsx` — form posting to `registerUser` then redirect to `/login`. Fields: name, email, password, phone, gender select, birthDate date input. Portuguese labels.

Create `src/app/(auth)/login/page.tsx` — form calling `signIn("credentials", { email, password, redirectTo: "/meus-ingressos" })`.

- [ ] **Step 5: Middleware**

Create `src/middleware.ts`:

```ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/minha-conta/:path*",
    "/meus-ingressos/:path*",
    "/evento/:path*",
  ],
};
```

- [ ] **Step 6: Manual smoke**

```bash
npm run dev
```

Register a user ≥18, login, hit `/minha-conta` (create stub page that shows session email).

Create stub `src/app/(participant)/minha-conta/page.tsx` using `auth()` and profile form.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.config.ts src/lib/actions/profile.ts src/lib/validations src/app src/middleware.ts src/types
git commit -m "feat: auth register/login with age gate and route protection"
```

---

### Task 5: Events public + admin CRUD

**Files:**
- Create: `src/lib/validations/event.ts`, `src/lib/actions/events.ts`, `src/lib/actions/admin.ts`, event pages under `(public)` and `(admin)`, `src/components/events/*`

- [ ] **Step 1: Event validation**

```ts
// src/lib/validations/event.ts
import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  venue: z.string().min(2).max(120),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(80),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacityMen: z.coerce.number().int().min(1).max(500),
  capacityWomen: z.coerce.number().int().min(1).max(500),
  priceCents: z.coerce.number().int().min(0),
  status: z.enum(["draft", "published", "sold_out", "live", "closed"]),
});
```

- [ ] **Step 2: Admin create/update/list actions**

Implement `src/lib/actions/admin.ts`:

- `requireAdmin()` — `auth()` + role admin + load OrganizationMember  
- `createEvent(formData)` — attach default org `speeddate-br`, create Event + EventSession (`not_started`)  
- `updateEvent(id, formData)`  
- `listAdminEvents()`  

Implement `src/lib/actions/events.ts`:

- `listPublishedEvents()`  
- `getEventBySlug(slug)` with occupancy counts for remaining spots using `remainingSpots`  

Occupancy query pattern:

```ts
const tickets = await prisma.ticket.groupBy({
  by: ["status"],
  where: { eventId },
  _count: true,
});
// Join users for gender counts of pending+paid
const rows = await prisma.ticket.findMany({
  where: { eventId, status: { in: ["pending", "paid"] } },
  include: { user: { select: { gender: true } } },
});
```

- [ ] **Step 3: UI pages**

- `/eventos` — list published EventCards (title, city, date, price BRL, remaining men/women)  
- `/eventos/[slug]` — detail + CTA “Comprar ingresso” (links to checkout in next task)  
- `/admin/eventos` — table of events  
- `/admin/eventos/novo` — form  
- `/admin/eventos/[id]` — edit + roster shell (check-in buttons next task)  
- `/admin` — links to eventos  

Format money:

```ts
new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
```

- [ ] **Step 4: Manual verify**

Login as admin, create published event, see it on `/eventos`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions src/lib/validations/event.ts src/app src/components
git commit -m "feat: public event listing and admin event CRUD"
```

---

### Task 6: Checkout + Mercado Pago webhook

**Files:**
- Create: `src/lib/mercadopago.ts`, `src/app/api/checkout/route.ts`, `src/app/api/webhooks/mercadopago/route.ts`, `src/lib/actions/tickets.ts`, payment result pages

- [ ] **Step 1: MP client helper**

```ts
// src/lib/mercadopago.ts
import { MercadoPagoConfig, Preference } from "mercadopago";

export function getMpClient() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN missing");
  return new MercadoPagoConfig({ accessToken: token });
}

export async function createTicketPreference(input: {
  ticketId: string;
  title: string;
  priceCents: number;
  payerEmail: string;
}) {
  const preference = new Preference(getMpClient());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await preference.create({
    body: {
      items: [
        {
          id: input.ticketId,
          title: input.title,
          quantity: 1,
          unit_price: input.priceCents / 100,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.ticketId,
      back_urls: {
        success: `${appUrl}/pagamento/sucesso?ticket=${input.ticketId}`,
        pending: `${appUrl}/pagamento/pendente?ticket=${input.ticketId}`,
        failure: `${appUrl}/eventos`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    },
  });
  return result;
}
```

- [ ] **Step 2: Checkout API**

`POST /api/checkout` body `{ eventId }`:

1. `auth()` required  
2. Load user + event (must be `published`)  
3. Load occupancy; `canSellTicket` for user.gender  
4. Create `Ticket` pending  
5. Create MP preference; return `{ initPoint: result.init_point }`  
6. On MP failure, cancel ticket  

Also implement **dev bypass** when `MERCADOPAGO_ACCESS_TOKEN` starts with `TEST-DEV-BYPASS`: mark ticket paid immediately and return `{ initPoint: "/pagamento/sucesso?ticket=..." }` so local/E2E works without MP.

- [ ] **Step 3: Webhook**

```ts
// src/app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Payment, MercadoPagoConfig } from "mercadopago";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // MP sends topic/query variants; support payment id in body.data.id or query
  const paymentId =
    body?.data?.id?.toString() ||
    req.nextUrl.searchParams.get("data.id") ||
    req.nextUrl.searchParams.get("id");

  if (!paymentId) return NextResponse.json({ ok: true });

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });
  const payment = await new Payment(client).get({ id: paymentId });
  const ticketId = payment.external_reference;
  if (!ticketId) return NextResponse.json({ ok: true });

  if (payment.status === "approved") {
    await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        status: { in: ["pending", "paid"] },
      },
      data: {
        status: "paid",
        mpPaymentId: String(paymentId),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
```

Idempotency: `mpPaymentId` unique; `updateMany` safe to replay.

- [ ] **Step 4: Participant tickets page + buy button**

- Event detail: button calls checkout, redirects to `initPoint`  
- `/meus-ingressos` lists tickets with status  
- Success/pending pages show status from DB  

- [ ] **Step 5: Unit test capacity still used at checkout (integration-style with prisma mock optional)**

At minimum, keep domain tests green. If DB available, add `tests/integration/checkout-capacity.test.ts` that creates event capacity 1, two users, second purchase fails — optional if no test DB.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mercadopago.ts src/app/api src/lib/actions/tickets.ts src/app/pagamento src/app
git commit -m "feat: Mercado Pago checkout and webhook ticket confirmation"
```

---

### Task 7: Check-in + open/close voting + ballot

**Files:**
- Create: `src/lib/actions/voting.ts`, admin check-in UI, participant vote UI, `src/components/voting/ballot-list.tsx`, `src/components/admin/checkin-list.tsx`

- [ ] **Step 1: Admin actions**

In `src/lib/actions/admin.ts` add:

```ts
export async function checkInTicket(ticketId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.ticket.update({
    where: { id: ticketId, status: "paid" },
    data: { checkedInAt: new Date() },
  });
  return { ok: true };
}

export async function openVoting(eventId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.eventSession.update({
    where: { eventId },
    data: { status: "voting_open", votingOpensAt: new Date() },
  });
  await prisma.event.update({ where: { id: eventId }, data: { status: "live" } });
  return { ok: true };
}

export async function closeVoting(eventId: string): Promise<ActionResult> {
  await requireAdmin();
  const session = await prisma.eventSession.findUniqueOrThrow({ where: { eventId } });
  const votes = await prisma.vote.findMany({ where: { sessionId: session.id } });
  const pairs = computeMutualMatches(
    votes.map((v) => ({
      fromUserId: v.fromUserId,
      toUserId: v.toUserId,
      interest: v.interest,
    }))
  );
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { sessionId: session.id } }),
    prisma.match.createMany({
      data: pairs.map((p) => ({
        sessionId: session.id,
        userAId: p.userAId,
        userBId: p.userBId,
      })),
    }),
    prisma.eventSession.update({
      where: { id: session.id },
      data: { status: "voting_closed", votingClosesAt: new Date() },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { status: "closed" },
    }),
  ]);
  return { ok: true };
}
```

- [ ] **Step 2: Vote action**

```ts
// src/lib/actions/voting.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canVote, oppositeGender } from "@/lib/domain/eligibility";
import { revalidatePath } from "next/cache";

export async function castVote(input: {
  eventId: string;
  toUserId: string;
  interest: "yes" | "no";
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Não autenticado." };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const ticket = await prisma.ticket.findFirst({
    where: { eventId: input.eventId, userId: user.id, status: "paid" },
  });
  const eventSession = await prisma.eventSession.findUnique({
    where: { eventId: input.eventId },
  });
  if (
    !ticket ||
    !eventSession ||
    !canVote({
      ticketStatus: ticket.status,
      checkedIn: !!ticket.checkedInAt,
      sessionStatus: eventSession.status,
      hasWhatsapp: !!user.phone,
    })
  ) {
    return { ok: false as const, error: "Você não pode votar agora." };
  }

  const target = await prisma.user.findUnique({ where: { id: input.toUserId } });
  if (!target || target.gender !== oppositeGender(user.gender)) {
    return { ok: false as const, error: "Voto inválido." };
  }

  // target must be checked-in paid for same event
  const targetTicket = await prisma.ticket.findFirst({
    where: {
      eventId: input.eventId,
      userId: target.id,
      status: "paid",
      checkedInAt: { not: null },
    },
  });
  if (!targetTicket) return { ok: false as const, error: "Pessoa não está no evento." };

  await prisma.vote.upsert({
    where: {
      sessionId_fromUserId_toUserId: {
        sessionId: eventSession.id,
        fromUserId: user.id,
        toUserId: target.id,
      },
    },
    create: {
      sessionId: eventSession.id,
      fromUserId: user.id,
      toUserId: target.id,
      interest: input.interest,
    },
    update: { interest: input.interest },
  });

  revalidatePath(`/evento/${input.eventId}/votar`);
  return { ok: true as const };
}

export async function getBallot(eventId: string) {
  // return candidates + existing votes or error reason
}
```

Implement `getBallot` to list opposite-gender checked-in users (id, name, photoUrl) and current votes.

- [ ] **Step 3: UI**

- Admin event detail: list paid tickets with Check-in button; Open voting / Close voting  
- `/evento/[id]/votar`: ballot list Yes/No buttons  
- Block states with clear pt-BR messages (sem check-in, votação fechada, preencha WhatsApp)  

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/voting.ts src/lib/actions/admin.ts src/app src/components
git commit -m "feat: check-in, voting window, and participant ballot"
```

---

### Task 8: Matches + who liked me + admin matches view

**Files:**
- Modify: `src/lib/actions/voting.ts`
- Create: `src/app/(participant)/evento/[id]/matches/page.tsx`, `curtidas/page.tsx`, admin matches page

- [ ] **Step 1: Queries**

```ts
export async function getMyMatches(eventId: string) {
  const session = await auth();
  // verify canViewResults
  // load Match where userA or userB is me
  // return other user name, phone, instagram
}

export async function getWhoLikedMe(eventId: string) {
  // votes to me interest yes after closed
  // return fromUser name only (no contact unless mutual — contacts only on matches page)
}
```

Spec: contacts only on mutual match. “Who liked me” shows who said yes (name); do **not** leak their WhatsApp unless mutual.

- [ ] **Step 2: Pages**

- Matches page: cards with name + WhatsApp link `https://wa.me/55...` + Instagram if present  
- Curtidas page: list of names  
- Admin matches: all pairs for session  

- [ ] **Step 3: Integration test (domain + closeVoting logic)**

Create `tests/unit/close-matching-pipeline.test.ts` using pure functions already covered; optional DB test if available.

Extend matching tests already present — ensure `whoLikedMe` tested:

```ts
import { whoLikedMe } from "@/lib/domain/matching";
// already exported — add test in matching.test.ts
```

Add to `tests/unit/matching.test.ts`:

```ts
it("lists who liked me", () => {
  const votes = [
    { fromUserId: "b", toUserId: "a", interest: "yes" as const },
    { fromUserId: "c", toUserId: "a", interest: "no" as const },
  ];
  expect(whoLikedMe(votes, "a")).toEqual(["b"]);
});
```

- [ ] **Step 4: Run unit tests + commit**

```bash
npx vitest run tests/unit
git add src tests
git commit -m "feat: mutual matches contacts and who-liked-me lists"
```

---

### Task 9: Landing, polish, layout, empty states

**Files:**
- Modify: `src/app/page.tsx`, `src/components/layout/header.tsx`, `src/app/globals.css`

- [ ] **Step 1: Marketing landing**

Hero: “Speed dating de verdade — encontre alguém em uma noite.”  
CTA: próximos eventos.  
Footer disclaimer: 18+.

- [ ] **Step 2: Header nav**

Logo, Eventos, Meus ingressos, Admin (if role), Login/Sair.

- [ ] **Step 3: Mobile-first CSS**

Ensure vote buttons are large tap targets (min 44px). Use Tailwind spacing.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/layout src/app/globals.css
git commit -m "feat: landing page and shared layout navigation"
```

---

### Task 10: Playwright smoke E2E (dev bypass payments)

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke-night.spec.ts`

- [ ] **Step 1: Config**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Step 2: Seed helpers via API or prisma in test setup**

E2E flow (with `MERCADOPAGO_ACCESS_TOKEN=TEST-DEV-BYPASS`):

1. Register man + woman (or use prisma in `globalSetup` to create users/event)  
2. Both buy tickets (bypass paid)  
3. Admin check-in both  
4. Open voting  
5. Each votes yes on the other  
6. Close voting  
7. Assert matches page shows partner phone  

Prefer **prisma seed script for e2e fixtures** `prisma/seed-e2e.ts` to reduce flakiness:

```ts
// creates org event + two paid users — invoked before test
```

- [ ] **Step 3: Run**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: PASS smoke.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e prisma/seed-e2e.ts
git commit -m "test: playwright smoke for full speed dating night flow"
```

---

### Task 11: README + verification gate

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document**

- Setup: Node 20+, Postgres, copy `.env.example`  
- `npm i && npx prisma db push && npm run db:seed && npm run dev`  
- Admin: `admin@speeddate.local` / `admin123456` (change in prod)  
- Mercado Pago sandbox tokens  
- Scripts for test  

- [ ] **Step 2: Full verification**

```bash
npx vitest run
npm run build
npm run test:e2e
```

Expected: unit green, build success, e2e green.

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: README with setup and verification commands"
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|------------------|------|
| Event list + detail + sell tickets | 5, 6 |
| Min registration + 18+ | 2, 4 |
| Single org + organizationId | 3 |
| Mercado Pago Pix/card | 6 |
| Check-in gates voting | 7 |
| Ballot opposite gender checked-in | 7 |
| Votes changeable until close | 7 upsert |
| Mutual match + contacts after close | 7 closeVoting, 8 |
| Who liked me (no contact leak) | 8 |
| Admin CRUD + open/close voting | 5, 7 |
| Capacity by gender | 2, 6 |
| Landing pt-BR | 9 |
| Unit + e2e tests | 2, 10 |
| Multi-org ready schema | 3 |
| Travel out of scope | — (not planned) |

## Placeholder scan

No TBD steps; dev payment bypass is explicit for local/E2E.

## Type consistency

- Gender: `"male" | "female"` in domain and Prisma enum  
- Session status: `not_started` \| `voting_open` \| `voting_closed`  
- Ticket status: `pending` \| `paid` \| `cancelled` \| `refunded`  
- Match pair: `userAId` / `userBId` lexicographic  

---

## Execution handoff

Plan saved. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — same session with `executing-plans`, checkpoints between batches  

**Which approach?**
