import SwiftUI

struct WeekView: View {
    @Environment(AppStore.self) private var store
    @State private var selectedDay: Weekday = Weekday.currentOrMonday

    var body: some View {
        NavigationStack {
            TimelineView(.everyMinute) { context in
                VStack(spacing: 0) {
                    Picker("Day", selection: $selectedDay) {
                        ForEach(Weekday.schoolWeek) { day in
                            Text(day.veryShortName).tag(day)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.top, 8)

                    List {
                        daySection(now: context.date)
                        onlineSection
                    }
                }
            }
            .navigationTitle("Schedule")
        }
    }

    @ViewBuilder
    private func daySection(now: Date) -> some View {
        let entries = store.entries(on: selectedDay)
        if entries.isEmpty {
            Section {
                ContentUnavailableView("No classes",
                                       systemImage: "sun.max",
                                       description: Text("Nothing scheduled on \(selectedDay.fullName)."))
            }
        } else {
            Section {
                ForEach(entries) { entry in
                    NavigationLink {
                        CourseDetailView(courseID: entry.course.id)
                    } label: {
                        WeekEntryRow(entry: entry, isLive: isLive(entry, now: now))
                    }
                }
            } header: {
                Text("\(selectedDay.fullName) · \(entries.count) class\(entries.count == 1 ? "" : "es")")
            }
        }
    }

    @ViewBuilder
    private var onlineSection: some View {
        let online = store.courses.filter(\.isOnline)
        if !online.isEmpty {
            Section("Online courses") {
                ForEach(online) { course in
                    NavigationLink {
                        CourseDetailView(courseID: course.id)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "wifi")
                                .foregroundStyle(courseColor(course.colorIndex))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(course.code) · \(course.title)")
                                    .font(.subheadline.weight(.medium))
                                Text("Asynchronous — no scheduled meetings")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func isLive(_ entry: DayEntry, now: Date) -> Bool {
        guard selectedDay.isToday, store.isInSemester(now) else { return false }
        let calendar = Calendar.current
        let minutesNow = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)
        return minutesNow >= entry.meeting.startMinutes && minutesNow < entry.meeting.endMinutes
    }
}

private struct WeekEntryRow: View {
    let entry: DayEntry
    let isLive: Bool

    var body: some View {
        let color = courseColor(entry.course.colorIndex)
        HStack(spacing: 12) {
            VStack(alignment: .trailing, spacing: 2) {
                Text(timeString(entry.meeting.startMinutes))
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
                Text(timeString(entry.meeting.endMinutes))
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            .frame(width: 74, alignment: .trailing)

            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4, height: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.course.code)
                    .font(.subheadline.weight(.semibold))
                Text(entry.course.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Label(entry.meeting.room, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if isLive {
                Text("Now")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(color, in: Capsule())
                    .foregroundStyle(.white)
            }
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    WeekView()
        .environment(AppStore())
}
