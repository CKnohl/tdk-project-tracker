// View-model types for embedded PostgREST selects. We attach these via
// `.returns<T>()` so queries stay fully typed without relationship metadata.
import type {
  ProjectRow,
  TaskRow,
  SubmittalRow,
  SubmittalHistoryRow,
  ProjectNoteRow,
  ProjectContactRow,
  ProjectFileRow,
  ActivityLogRow,
  NotificationRow,
  CalendarEventRow,
} from '@/types/database.types';

export interface CompanyRef {
  id: number;
  key: string;
  name: string;
  color: string | null;
}

export interface StaffRef {
  id: string;
  full_name: string;
  initials: string | null;
}

export interface ProjectRef {
  id: string;
  project_number: string;
  name: string;
}

export interface ProjectListItem extends ProjectRow {
  company: CompanyRef | null;
  manager: StaffRef | null;
}

export interface TaskWithProject extends TaskRow {
  project: ProjectRef | null;
}

export interface TaskWithStaff extends TaskRow {
  assignees: { staff: StaffRef | null }[];
}

export interface SubmittalWithProject extends SubmittalRow {
  project: ProjectRef | null;
  assigned: StaffRef | null;
}

export interface SubmittalHistoryItem extends SubmittalHistoryRow {
  actor: { full_name: string | null } | null;
}

export interface NoteItem extends ProjectNoteRow {
  author: { full_name: string | null } | null;
}

export interface ContactItem extends ProjectContactRow {}

export interface FileItem extends ProjectFileRow {
  uploader: { full_name: string | null } | null;
}

export interface ActivityItem extends ActivityLogRow {
  actor: { id: string; full_name: string | null } | null;
  project: ProjectRef | null;
}

export interface NotificationItem extends NotificationRow {
  project: ProjectRef | null;
}

export interface CalendarEventItem extends CalendarEventRow {
  project: ProjectRef | null;
}

export interface ProjectStaffMember {
  staff: StaffRef | null;
  role_on_project: string | null;
}
