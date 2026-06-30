import { redirect } from 'next/navigation';

// V5: Notifications were merged into the My Work “Inbox” (one owner: the
// notifications table, one UI: NotificationsList). This route is kept only so old
// links / bookmarks land in the right place.
export default function NotificationsRedirect() {
  redirect('/my-work?tab=inbox');
}
