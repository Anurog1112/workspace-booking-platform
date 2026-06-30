# Technical Architecture

## Recommended Architecture

ใช้ Next.js เป็นทั้ง frontend และ backend ตามโจทย์ โดย backend logic อยู่ใน server actions, route handlers, service layer และ Prisma queries

```text
Browser
  -> Next.js App Router
    -> Server Components / Client Components
    -> Auth.js session
    -> Server Actions / Route Handlers
    -> Service Layer
    -> Prisma
    -> Supabase PostgreSQL
    -> Supabase Storage
```

## Application Layers

### UI Layer

- `src/app`: routes, layouts, pages
- `src/components`: reusable UI components
- `src/features`: feature-specific screens and forms

### Server Layer

- `src/server/actions`: server actions for forms
- `src/server/services`: business logic
- `src/server/repositories`: database access via Prisma
- `src/server/validators`: Zod schemas
- `src/server/auth`: auth helpers and role checks

### Data Layer

- `prisma/schema.prisma`: database models
- Supabase PostgreSQL: production database
- Supabase Storage: room images and payment proof files

## Route Groups

```text
src/app
  (public)
    page.tsx
    rooms/page.tsx
  (auth)
    login/page.tsx
    register/page.tsx
  (member)
    dashboard/page.tsx
    bookings/page.tsx
  (staff)
    staff/bookings/page.tsx
    staff/checkins/page.tsx
  (admin)
    admin/dashboard/page.tsx
    admin/rooms/page.tsx
    admin/branches/page.tsx
    admin/amenities/page.tsx
```

## Key Business Rules

- ห้องหนึ่งห้องจองทับช่วงเวลาเดียวกันไม่ได้
- เฉพาะ booking ที่ `CONFIRMED` หรือ `PENDING_REVIEW` เท่านั้นที่ถือว่า block ช่วงเวลา
- Member เห็นและแก้ไขได้เฉพาะ booking ของตัวเอง
- Staff จัดการ booking/payment/check-in ได้ แต่จัดการ room master data ไม่ได้
- Super Admin จัดการ master data และ role ได้
- File upload ต้องเป็น image หรือ PDF เท่านั้น และต้องจำกัดขนาด

## Auth and RBAC

- ใช้ Auth.js สำหรับ session
- เพิ่ม `role` ใน user profile
- ใช้ middleware ป้องกัน route group
- ใช้ server-side guard ก่อนทำ server action หรือ API ทุกครั้ง
- ไม่พึ่ง client-side hide button เป็น security หลัก

## Deployment

- Next.js deploy บน Vercel
- Database ใช้ Supabase PostgreSQL
- Storage ใช้ Supabase Storage bucket
- Environment variables ตั้งใน Vercel project settings

## Required Environment Variables

```text
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
```

หมายเหตุ: ถ้าเริ่มด้วย Credentials provider อาจยังไม่ต้องใช้ Google OAuth ใน MVP
