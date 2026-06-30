# Product Requirements

## Summary

ระบบ Workspace Booking Platform ใช้สำหรับให้สมาชิกจองห้องประชุมหรือพื้นที่ทำงาน ตรวจสอบสถานะการจอง และให้ staff/admin จัดการห้อง การชำระเงิน และการเข้าใช้งานจริง

## Objectives

- ทำโปรเจกต์ให้ตรงโจทย์ `Next.js + Supabase + Auth.js + RBAC`
- มีตารางที่ออกแบบเองอย่างน้อย 5 ตาราง พร้อมความสัมพันธ์ชัดเจน
- มี CRUD หลักที่ใช้งานได้จริง
- มี business logic ที่อธิบายได้ เช่น ป้องกันการจองเวลาทับกัน
- ทำ UI ให้ดูเป็นระบบ SaaS สำหรับพอร์ตสมัครงาน

## In Scope

- Login/logout ด้วย Auth.js
- Role-based access control สำหรับ `SUPER_ADMIN`, `STAFF`, `MEMBER`
- จัดการข้อมูลสาขา
- จัดการข้อมูลห้องและราคา
- จัดการสิ่งอำนวยความสะดวกของห้อง
- ค้นหาห้องตามวัน เวลา จำนวนคน และสถานะ
- สร้างรายการจอง
- ตรวจสอบไม่ให้จองเวลาทับกัน
- อัปโหลดหลักฐานชำระเงินผ่าน Supabase Storage
- Staff อนุมัติ/ปฏิเสธรายการจอง
- Dashboard สรุปยอดจอง สถานะ และรายได้โดยประมาณ

## Out of Scope for MVP

- ระบบชำระเงินจริงผ่าน payment gateway
- ระบบ seat map แบบละเอียด
- Mobile app แยก
- Multi-tenant SaaS เต็มรูปแบบ
- Go/NestJS backend แยก

## Core User Stories

### Member

- ในฐานะ member ฉันต้องการดูห้องว่าง เพื่อเลือกห้องที่เหมาะกับเวลาและจำนวนคน
- ในฐานะ member ฉันต้องการจองห้อง เพื่อเก็บสิทธิ์การใช้งานช่วงเวลานั้น
- ในฐานะ member ฉันต้องการอัปโหลดหลักฐานชำระเงิน เพื่อให้ staff ตรวจสอบ
- ในฐานะ member ฉันต้องการดูประวัติการจอง เพื่อรู้สถานะรายการของตัวเอง

### Staff

- ในฐานะ staff ฉันต้องการดูรายการจองทั้งหมด เพื่อจัดการงานประจำวัน
- ในฐานะ staff ฉันต้องการอนุมัติหรือปฏิเสธหลักฐานการชำระเงิน
- ในฐานะ staff ฉันต้องการเช็คอินผู้ใช้เมื่อมาถึงสถานที่

### Super Admin

- ในฐานะ super admin ฉันต้องการจัดการห้อง สาขา ราคา และสิ่งอำนวยความสะดวก
- ในฐานะ super admin ฉันต้องการดู dashboard เพื่อเข้าใจภาพรวมการใช้งาน
- ในฐานะ super admin ฉันต้องการจัดการ role ผู้ใช้ เพื่อควบคุมสิทธิ์ระบบ

## Acceptance Criteria

- ผู้ใช้ที่ยังไม่ login เข้า dashboard ไม่ได้
- `MEMBER` เข้าหน้า admin/staff ไม่ได้
- `STAFF` อนุมัติ booking ได้ แต่ลบห้องหรือเปลี่ยนราคาไม่ได้
- `SUPER_ADMIN` จัดการข้อมูล master data ได้
- ระบบไม่อนุญาตให้ booking ห้องเดียวกันทับช่วงเวลากัน
- Booking ต้องมีสถานะ เช่น `PENDING_PAYMENT`, `PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`
- มีอย่างน้อย 5 ตารางที่ไม่ใช่ตาราง Auth.js
- Deploy บน Vercel ได้ และเชื่อม Supabase production database

## Risks

- Auth.js + Prisma + Supabase ต้องตั้งค่า connection ให้ถูกต้องบน Vercel
- Booking overlap logic ต้องเขียนและทดสอบดี เพราะเป็น business rule สำคัญ
- Upload file ต้องจำกัดชนิดและขนาดไฟล์
- ต้องคุม scope ไม่ให้ใหญ่เกิน final project
