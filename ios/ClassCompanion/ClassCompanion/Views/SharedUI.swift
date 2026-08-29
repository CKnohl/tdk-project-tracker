import SwiftUI

// MARK: - Course colors

let coursePalette: [Color] = [.blue, .teal, .orange, .purple, .green, .indigo, .pink, .brown]

func courseColor(_ index: Int) -> Color {
    coursePalette[abs(index) % coursePalette.count]
}

// MARK: - Time formatting

/// "8:35 AM" from minutes after midnight.
func timeString(_ minutes: Int) -> String {
    let hour24 = minutes / 60
    let minute = minutes % 60
    let hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12
    let suffix = hour24 < 12 ? "AM" : "PM"
    return String(format: "%d:%02d %@", hour12, minute, suffix)
}

/// "8:35 AM – 9:25 AM"
func timeRangeString(_ meeting: ClassMeeting) -> String {
    "\(timeString(meeting.startMinutes)) – \(timeString(meeting.endMinutes))"
}

/// "1h 5m" style countdown between two dates.
func remainingString(until end: Date, from now: Date) -> String {
    let seconds = Int(end.timeIntervalSince(now))
    if seconds < 60 { return "under a minute" }
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    if hours > 0 && minutes > 0 { return "\(hours)h \(minutes)m" }
    if hours > 0 { return "\(hours)h" }
    return "\(minutes)m"
}

/// "Due today · 11:59 PM", "Due tomorrow · 9:00 AM", "Due Mon, Sep 7"
func dueLabel(_ due: Date) -> String {
    let calendar = Calendar.current
    if calendar.isDateInToday(due) {
        return "Due today · " + due.formatted(date: .omitted, time: .shortened)
    }
    if calendar.isDateInTomorrow(due) {
        return "Due tomorrow · " + due.formatted(date: .omitted, time: .shortened)
    }
    return "Due " + due.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
}

func dueColor(_ due: Date, completed: Bool, now: Date = Date()) -> Color {
    if completed { return .secondary }
    if due < now { return .red }
    if Calendar.current.isDateInToday(due) { return .orange }
    return .secondary
}

/// Stored attachment names are "<UUID>-originalname.ext"; show just the original name.
func attachmentDisplayName(_ stored: String) -> String {
    stored.count > 37 ? String(stored.dropFirst(37)) : stored
}

// MARK: - Small shared views

struct CourseChip: View {
    let course: Course

    var body: some View {
        Text(course.code)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(courseColor(course.colorIndex).opacity(0.18), in: Capsule())
            .foregroundStyle(courseColor(course.colorIndex))
    }
}

struct InfoCard: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.tint)
            Text(text)
                .font(.subheadline)
            Spacer(minLength: 0)
        }
        .padding()
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}
