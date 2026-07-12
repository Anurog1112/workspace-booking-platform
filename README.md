# Workspace Booking Platform

ระบบจองห้องประชุมและพื้นที่ทำงานร่วมกันสำหรับ Capstone Project วิชา Full-stack Web Development with Next.js & Supabase

## Project Goal

สร้างเว็บแอปพลิเคชันแบบ Full-stack ที่แสดงความสามารถด้าน Next.js, Auth.js, RBAC, Supabase PostgreSQL, CRUD, dashboard และการ deploy บน Vercel โดยคุม scope ให้เหมาะกับการทำคนเดียวและอธิบายโค้ดได้ในวันสอบปากเปล่า

## Proposed Stack

- Next.js App Router
- TypeScript
- Auth.js / NextAuth.js
- Prisma
- Supabase PostgreSQL
- Supabase Storage
- Tailwind CSS
- shadcn/ui
- Zod
- React Hook Form
- Vercel
- GitHub

## User Roles

- `SUPER_ADMIN`: จัดการสาขา ห้อง ราคา สิ่งอำนวยความสะดวก และดูภาพรวมระบบ
- `STAFF`: ตรวจสอบรายการจอง อนุมัติ/ปฏิเสธหลักฐานชำระเงิน และเช็คอินผู้ใช้
- `MEMBER`: ค้นหาห้อง จองช่วงเวลา อัปโหลดหลักฐานชำระเงิน และดูประวัติการจอง

## Planning Documents

- [Product Requirements](docs/01-product-requirements.md)
- [Technical Architecture](docs/02-technical-architecture.md)
- [Database ERD DBML](docs/03-database-schema.dbml)
- [RBAC Matrix](docs/04-rbac-matrix.md)
- [Development Roadmap](docs/05-development-roadmap.md)

## Current Status

Phase: deployed product. ระบบมี Credentials/Google authentication, role-based dashboards, room search and booking, payment review, room management, user role management และเชื่อมต่อ Supabase PostgreSQL บน production แล้ว

## Google Sign-In

Google OAuth จะเปิดใช้งานอัตโนมัติเมื่อกำหนด environment variables ต่อไปนี้ทั้ง local และ Vercel:

```env
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

ตั้งค่า Authorized redirect URI ใน Google Cloud Console เป็น:

```text
http://localhost:3000/api/auth/callback/google
https://workspace-booking-platform.vercel.app/api/auth/callback/google
```

ผู้ใช้ Google ใหม่จะได้รับ role `MEMBER` อัตโนมัติ ส่วนการกำหนด `STAFF` หรือ `SUPER_ADMIN` ต้องทำผ่านหน้า Super Admin เท่านั้น
