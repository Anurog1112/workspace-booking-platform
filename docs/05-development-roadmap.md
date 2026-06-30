# Development Roadmap

## Phase 0: Planning

- Confirm project name
- Confirm stack
- Confirm MVP scope
- Review ERD
- Review RBAC matrix
- Prepare GitHub repository

## Phase 1: Foundation

- Initialize Next.js project
- Configure TypeScript, Tailwind, linting
- Add shadcn/ui baseline components
- Configure Prisma
- Connect Supabase PostgreSQL
- Add Auth.js
- Add base layout and navigation

## Phase 2: Auth and RBAC

- Implement login/register
- Add user profile and role
- Add middleware route protection
- Add server-side role guards
- Seed demo users for `SUPER_ADMIN`, `STAFF`, `MEMBER`

## Phase 3: Admin Master Data

- CRUD branches
- CRUD rooms
- CRUD amenities
- Attach amenities to rooms
- Upload room image

## Phase 4: Booking Flow

- Public/member room search
- Booking form
- Booking overlap validation
- Booking history
- Cancel pending booking

## Phase 5: Payment and Staff Workflow

- Upload payment proof
- Staff booking queue
- Approve/reject payment
- Confirm booking
- Check-in booking

## Phase 6: Dashboard and Polish

- Admin dashboard
- Staff dashboard
- Loading, empty, and error states
- Responsive UI
- Dark/light mode if time allows

## Phase 7: Verification and Deployment

- Test happy paths and role restrictions
- Test booking overlap cases
- Review security checklist
- Prepare `.env.example`
- Deploy to Vercel
- Prepare viva explanation notes
