import { redirect } from 'next/navigation';

// V6.1.1: Users & Roles merged into Staff Management — one roster, one surface.
// This route stays only so old bookmarks land in the right place.
export default function UsersSettingsRedirect() {
  redirect('/settings/staff');
}
