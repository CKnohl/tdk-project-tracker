# ClassCompanion

A native iPhone app (SwiftUI) built around Connor's Fall 2026 class schedule at the University of Utah. It runs live against the current time, tracks assignments per course, stores uploaded syllabi, and can pull assignments straight from Canvas.

## What it does

- **Now tab** — a live clock (ticks every second) that shows the class you're in right now with a progress bar and "ends in" countdown, the next class coming up with a countdown, today's full class list, and your next assignments due.
- **Schedule tab** — the full weekly schedule (Mon–Fri picker), with the class currently in session highlighted. Online/asynchronous courses (ECON 2010) are listed separately.
- **Assignments tab** — assignments grouped by Overdue / Due Today / This Week / Later, with checkboxes to complete, swipe to delete, and a Canvas sync button. Add assignments manually with the + button and attach files to them.
- **Courses tab** — every enrolled course with meeting times, rooms, and credits. Open a course to **upload its syllabus** (PDF or other files, viewable in-app), see and add its assignments, and check its Canvas link status.
- **Settings tab** — Canvas connection (URL + access token), manual sync, and a reset button.

## The schedule baked in (Fall 2026, Aug 24 – Dec 10)

| Course | Title | Days / Times | Room |
|---|---|---|---|
| CVEEN 2320 | Civil Econ & Mgmt | MWF 8:35–9:25 AM | WEB 2230 |
| CVEEN 3016 | Hydro-Enviro Lab | F 12:55–3:55 PM | LEB 130 |
| CVEEN 3100 | Tech Comm for Engrs | TuTh 10:45 AM–12:05 PM | WEB 2250 |
| CVEEN 3410 | Hydraulics | MWF 9:40–10:30 AM | WEB 1250 |
| CVEEN 3510 | Civil Engg Materials | MWF 10:45–11:35 AM | WEB L102 |
| CVEEN 3610 | Environmental Engg | TuTh 9:10–10:30 AM | WEB L102 |
| ECON 2010 | Princ of Microeconomics | Online, asynchronous | — |

Only **enrolled** sections are included — the waitlisted Thursday lab section is intentionally left out. If you get off the waitlist and your schedule changes, edit `seedCourses()` in `ClassCompanion/AppStore.swift`, then use **Settings → Reset schedule** in the app to pick up the change.

## Building and installing (needs a Mac)

1. Requirements: **Xcode 16 or newer** on a Mac, iPhone running **iOS 17+**.
2. Open `ClassCompanion.xcodeproj` in Xcode.
3. Select the ClassCompanion target → **Signing & Capabilities** → pick your **Team** (sign into Xcode with your Apple ID under Settings → Accounts if you haven't).
4. Plug in your iPhone (or pick a simulator), select it as the run destination, and hit **Run** (⌘R).
5. First run on a real device: on the phone, go to Settings → General → VPN & Device Management and trust your developer certificate.

> With a free Apple ID, apps you sideload stop launching after 7 days until you re-run them from Xcode. A paid Apple Developer account extends that to a year (or use TestFlight).

## Linking Canvas

1. In a browser, open `https://utah.instructure.com` → **Account → Settings** → scroll to **Approved Integrations** → **+ New Access Token** → copy the token.
2. In the app: **Settings tab** → paste the token → **Save Token** → **Sync Now** (there's also a sync button on the Assignments tab).
3. Sync matches your Canvas courses to the schedule by course code (e.g. `CVEEN 3410`) and imports each course's assignments with names, due dates, points, and a link to open them in Canvas. Re-sync any time; completion checkmarks you set locally are preserved.

The token is stored only in the device Keychain, and the app makes requests only to the Canvas host you configure. No other servers are involved — schedule, assignments, and uploaded files all live on the phone.

## Uploading syllabi and files

- **Syllabus**: Courses tab → open a course → **Upload syllabus** → pick the file from the Files app (PDF, Word, images all work). Tap it any time to read it in-app; replace or remove it from the same screen.
- **Assignment files**: open any assignment → **Attachment → Add file**.

## Project layout

```
ClassCompanion/
├── ClassCompanionApp.swift   # App entry + tab bar
├── Models.swift              # Course / ClassMeeting / Assignment / Weekday
├── AppStore.swift            # State, persistence (JSON), schedule math, seed data, Canvas sync
├── CanvasAPI.swift           # Canvas REST client, course matching, Keychain helper
└── Views/
    ├── NowView.swift         # Live clock + current/next class
    ├── WeekView.swift        # Weekly schedule
    ├── AssignmentsView.swift # List, add form, detail
    ├── CoursesView.swift     # Course list/detail + syllabus upload
    ├── SettingsView.swift    # Canvas settings, reset
    └── SharedUI.swift        # Colors, time formatting, shared components
```

## Ideas for later

- Local notifications ~15 minutes before each class
- Home screen / lock screen widget with the next class
- Parsing due dates out of an uploaded syllabus automatically
- Grade tracking from the Canvas submissions API
