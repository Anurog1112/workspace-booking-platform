# RBAC Matrix

## Roles

- `SUPER_ADMIN`: ผู้ดูแลระบบสูงสุด
- `STAFF`: เจ้าหน้าที่ดูแลการจองและการเข้าใช้งาน
- `MEMBER`: ผู้ใช้งานทั่วไป

## Permissions

| Feature | SUPER_ADMIN | STAFF | MEMBER |
|---|---:|---:|---:|
| View public rooms | Yes | Yes | Yes |
| Register/login | Yes | Yes | Yes |
| View own dashboard | Yes | Yes | Yes |
| Create booking | Yes | Yes | Yes |
| View own bookings | Yes | Yes | Yes |
| Cancel own pending booking | Yes | Yes | Yes |
| Upload payment proof | Yes | Yes | Yes |
| View all bookings | Yes | Yes | No |
| Approve/reject payment | Yes | Yes | No |
| Check in member | Yes | Yes | No |
| Create/update room | Yes | No | No |
| Delete/deactivate room | Yes | No | No |
| Manage branch | Yes | No | No |
| Manage amenities | Yes | No | No |
| Manage user roles | Yes | No | No |
| View admin analytics | Yes | Limited | No |

## Route Protection Draft

| Route Pattern | Allowed Roles |
|---|---|
| `/` | Public |
| `/rooms` | Public |
| `/login` | Public |
| `/register` | Public |
| `/dashboard` | `SUPER_ADMIN`, `STAFF`, `MEMBER` |
| `/bookings` | `SUPER_ADMIN`, `STAFF`, `MEMBER` |
| `/staff/*` | `SUPER_ADMIN`, `STAFF` |
| `/admin/*` | `SUPER_ADMIN` |

## API/Action Guard Rule

ทุก server action และ route handler ต้องเช็ค session และ role ฝั่ง server อีกครั้ง แม้หน้าเว็บจะซ่อนปุ่มแล้วก็ตาม
