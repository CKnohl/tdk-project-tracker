import SwiftUI

struct NowView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                ScrollView {
                    VStack(spacing: 16) {
                        clockHeader(now: context.date)
                        semesterBanner(now: context.date)
                        currentClassCard(now: context.date)
                        nextClassCard(now: context.date)
                        todaySection(now: context.date)
                        dueSoonSection(now: context.date)
                    }
                    .padding()
                }
                .background(Color(uiColor: .systemGroupedBackground))
            }
            .navigationTitle("Now")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Clock

    private func clockHeader(now: Date) -> some View {
        VStack(spacing: 4) {
            Text(now.formatted(.dateTime.hour().minute().second()))
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .monospacedDigit()
            Text(now.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }

    // MARK: - Semester banner

    @ViewBuilder
    private func semesterBanner(now: Date) -> some View {
        if now < AppStore.semesterStart {
            InfoCard(icon: "calendar.badge.clock",
                     text: "Fall 2026 begins \(AppStore.semesterStart.formatted(date: .abbreviated, time: .omitted)).")
        } else if now > AppStore.semesterEnd {
            InfoCard(icon: "party.popper.fill",
                     text: "The semester is over — nice work!")
        }
    }

    // MARK: - Current class

    @ViewBuilder
    private func currentClassCard(now: Date) -> some View {
        if let current = store.currentMeeting(at: now) {
            let color = courseColor(current.course.colorIndex)
            let total = current.end.timeIntervalSince(current.start)
            let elapsed = now.timeIntervalSince(current.start)
            let progress = total > 0 ? min(1, max(0, elapsed / total)) : 0

            VStack(alignment: .leading, spacing: 10) {
                Label("In class now", systemImage: "dot.radiowaves.left.and.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(color)
                Text(current.course.code)
                    .font(.title2.bold())
                Text(current.course.title)
                    .font(.headline)
                    .foregroundStyle(.secondary)
                HStack(spacing: 14) {
                    Label(current.meeting.room, systemImage: "mappin.and.ellipse")
                    Label(timeRangeString(current.meeting), systemImage: "clock")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                ProgressView(value: progress)
                    .tint(color)
                Text("Ends in \(remainingString(until: current.end, from: now))")
                    .font(.subheadline.weight(.medium))
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(color.opacity(0.6), lineWidth: 1.5))
        }
    }

    // MARK: - Next class

    @ViewBuilder
    private func nextClassCard(now: Date) -> some View {
        if let next = store.nextMeeting(after: now) {
            let color = courseColor(next.course.colorIndex)
            let sameDay = Calendar.current.isDate(next.start, inSameDayAs: now)

            VStack(alignment: .leading, spacing: 8) {
                Label("Up next", systemImage: "arrow.right.circle.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(color)
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(next.course.code) · \(next.course.title)")
                            .font(.headline)
                        Label(next.meeting.room, systemImage: "mappin.and.ellipse")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        if sameDay {
                            Text(next.start.formatted(date: .omitted, time: .shortened))
                                .font(.headline)
                            Text("in \(remainingString(until: next.start, from: now))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        } else {
                            Text(next.start.formatted(.dateTime.weekday(.abbreviated)))
                                .font(.headline)
                            Text(next.start.formatted(date: .omitted, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        }
    }

    // MARK: - Today's classes

    @ViewBuilder
    private func todaySection(now: Date) -> some View {
        let todays = store.meetings(on: now)
        if !todays.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today")
                    .font(.title3.bold())
                VStack(spacing: 8) {
                    ForEach(todays) { instance in
                        TodayMeetingRow(instance: instance, now: now)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else if store.isInSemester(now) {
            InfoCard(icon: "sun.max.fill", text: "No classes today — enjoy the free time!")
        }
    }

    // MARK: - Due soon

    @ViewBuilder
    private func dueSoonSection(now: Date) -> some View {
        let upcoming = store.assignments
            .filter { !$0.isCompleted && $0.dueDate != nil }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
            .prefix(3)

        if !upcoming.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Due soon")
                    .font(.title3.bold())
                VStack(spacing: 8) {
                    ForEach(Array(upcoming)) { assignment in
                        NavigationLink {
                            AssignmentDetailView(assignmentID: assignment.id)
                        } label: {
                            HStack(spacing: 10) {
                                if let course = store.course(id: assignment.courseID) {
                                    CourseChip(course: course)
                                }
                                Text(assignment.title)
                                    .font(.subheadline)
                                    .foregroundStyle(.primary)
                                    .lineLimit(1)
                                Spacer()
                                if let due = assignment.dueDate {
                                    Text(dueLabel(due))
                                        .font(.caption)
                                        .foregroundStyle(dueColor(due, completed: false, now: now))
                                }
                            }
                            .padding(12)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct TodayMeetingRow: View {
    let instance: MeetingInstance
    let now: Date

    var body: some View {
        let color = courseColor(instance.course.colorIndex)
        let isPast = now >= instance.end
        let isLive = instance.start <= now && now < instance.end

        HStack(spacing: 12) {
            Text(instance.start.formatted(date: .omitted, time: .shortened))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
                .frame(width: 76, alignment: .leading)
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4, height: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(instance.course.code) · \(instance.course.title)")
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text(instance.meeting.room)
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
            } else if isPast {
                Image(systemName: "checkmark")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
        .opacity(isPast ? 0.55 : 1)
    }
}

#Preview {
    NowView()
        .environment(AppStore())
}
