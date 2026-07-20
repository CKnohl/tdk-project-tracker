-- 0043_staff_phone.sql
-- Staff phone number (notes: "Have ppl's phone numbers"). A single nullable column
-- on the existing staff record — no new table, no new owner. Editable through the
-- existing staff form (manager/admin), shown on the staff profile.
--
-- Additive + IDEMPOTENT. No existing rows change. RLS from 0012 already governs
-- the staff table (read: authenticated; write: manager/admin).

alter table staff add column if not exists phone text;
