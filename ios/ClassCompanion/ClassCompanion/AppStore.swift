import Foundation
import Observation

@Observable
final class AppStore {
    var courses: [Course] = []
    var assignments: [Assignment] = []
    var lastCanvasSync: Date?

    init() {
        load()
        if courses.isEmpty {
            courses = Self.seedCourses()
            save()
        }
    }

    // MARK: - Semester (Fall 2026)

    static var semesterStart: Date {
        Calendar.current.date(from: DateComponents(year: 2026, month: 8, day: 24)) ?? Date()
    }

    static var semesterEnd: Date {
        Calendar.current.date(from: DateComponents(year: 2026, month: 12, day: 10, hour: 23, minute: 59)) ?? Date()
    }

    func isInSemester(_ date: Date) -> Bool {
        date >= Self.semesterStart && date <= Self.semesterEnd
    }

    // MARK: - Seed data (imported from the "View My Classes" PDF, Fall 2026)

    static func seedCourses() -> [Course] {
        [
            Course(code: "CVEEN 2320", title: "Civil Econ & Mgmt", units: 3,
                   meetings: [ClassMeeting(days: [.monday, .wednesday, .friday],
                                           startMinutes: 8 * 60 + 35, endMinutes: 9 * 60 + 25,
                                           room: "WEB 2230")],
                   colorIndex: 0),
            Course(code: "CVEEN 3016", title: "Hydro-Enviro Lab", units: 1,
                   meetings: [ClassMeeting(days: [.friday],
                                           startMinutes: 12 * 60 + 55, endMinutes: 15 * 60 + 55,
                                           room: "LEB 130")],
                   colorIndex: 1),
            Course(code: "CVEEN 3100", title: "Tech Comm for Engrs", units: 3,
                   meetings: [ClassMeeting(days: [.tuesday, .thursday],
                                           startMinutes: 10 * 60 + 45, endMinutes: 12 * 60 + 5,
                                           room: "WEB 2250")],
                   colorIndex: 2),
            Course(code: "CVEEN 3410", title: "Hydraulics", units: 3,
                   meetings: [ClassMeeting(days: [.monday, .wednesday, .friday],
                                           startMinutes: 9 * 60 + 40, endMinutes: 10 * 60 + 30,
                                           room: "WEB 1250")],
                   colorIndex: 3),
            Course(code: "CVEEN 3510", title: "Civil Engg Materials", units: 3,
                   meetings: [ClassMeeting(days: [.monday, .wednesday, .friday],
                                           startMinutes: 10 * 60 + 45, endMinutes: 11 * 60 + 35,
                                           room: "WEB L102")],
                   colorIndex: 4),
            Course(code: "CVEEN 3610", title: "Environmental Engg", units: 3,
                   meetings: [ClassMeeting(days: [.tuesday, .thursday],
                                           startMinutes: 9 * 60 + 10, endMinutes: 10 * 60 + 30,
                                           room: "WEB L102")],
                   colorIndex: 5),
            Course(code: "ECON 2010", title: "Princ of Microeconomics", units: 3,
                   isOnline: true, meetings: [], colorIndex: 6),
        ]
    }

    // MARK: - Lookups

    func course(id: UUID) -> Course? {
        courses.first { $0.id == id }
    }

    func assignment(id: UUID) -> Assignment? {
        assignments.first { $0.id == id }
    }

    // MARK: - Schedule queries

    /// Meetings on the same weekday as `date`, as concrete dated instances, sorted by start time.
    /// Empty outside the semester date range.
    func meetings(on date: Date) -> [MeetingInstance] {
        guard isInSemester(date) else { return [] }
        let calendar = Calendar.current
        guard let weekday = Weekday(rawValue: calendar.component(.weekday, from: date)) else { return [] }

        var instances: [MeetingInstance] = []
        for course in courses {
            for meeting in course.meetings where meeting.days.contains(weekday) {
                let start = calendar.date(bySettingHour: meeting.startMinutes / 60,
                                          minute: meeting.startMinutes % 60,
                                          second: 0, of: date)
                let end = calendar.date(bySettingHour: meeting.endMinutes / 60,
                                        minute: meeting.endMinutes % 60,
                                        second: 0, of: date)
                if let start, let end {
                    instances.append(MeetingInstance(course: course, meeting: meeting, start: start, end: end))
                }
            }
        }
        return instances.sorted { $0.start < $1.start }
    }

    func currentMeeting(at date: Date) -> MeetingInstance? {
        meetings(on: date).first { $0.start <= date && date < $0.end }
    }

    /// The next upcoming meeting, today or within the next three weeks.
    func nextMeeting(after date: Date) -> MeetingInstance? {
        if let today = meetings(on: date).first(where: { $0.start > date }) {
            return today
        }
        let calendar = Calendar.current
        var day = date
        for _ in 1...21 {
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
            if let meeting = meetings(on: calendar.startOfDay(for: day)).first {
                return meeting
            }
        }
        return nil
    }

    /// Meetings on a given weekday (no specific date), sorted by start time.
    func entries(on day: Weekday) -> [DayEntry] {
        courses
            .flatMap { course in
                course.meetings
                    .filter { $0.days.contains(day) }
                    .map { DayEntry(course: course, meeting: $0) }
            }
            .sorted { $0.meeting.startMinutes < $1.meeting.startMinutes }
    }

    // MARK: - Mutations

    func addAssignment(_ assignment: Assignment) {
        assignments.append(assignment)
        save()
    }

    func updateAssignment(_ assignment: Assignment) {
        guard let index = assignments.firstIndex(where: { $0.id == assignment.id }) else { return }
        assignments[index] = assignment
        save()
    }

    func deleteAssignment(id: UUID) {
        if let index = assignments.firstIndex(where: { $0.id == id }) {
            if let file = assignments[index].attachmentFileName {
                Self.deleteAttachmentFile(named: file)
            }
            assignments.remove(at: index)
            save()
        }
    }

    func toggleComplete(id: UUID) {
        guard let index = assignments.firstIndex(where: { $0.id == id }) else { return }
        assignments[index].isCompleted.toggle()
        save()
    }

    func resetToSeed() {
        for course in courses {
            if let file = course.syllabusFileName { Self.deleteAttachmentFile(named: file) }
        }
        for assignment in assignments {
            if let file = assignment.attachmentFileName { Self.deleteAttachmentFile(named: file) }
        }
        courses = Self.seedCourses()
        assignments = []
        lastCanvasSync = nil
        save()
    }

    // MARK: - File attachments (syllabi, assignment files)

    static var attachmentsDirectory: URL {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Attachments", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    static func attachmentURL(named name: String) -> URL {
        attachmentsDirectory.appendingPathComponent(name)
    }

    static func deleteAttachmentFile(named name: String) {
        try? FileManager.default.removeItem(at: attachmentURL(named: name))
    }

    /// Copies a picked file into the app's attachments directory and returns the stored file name.
    private func importFile(from url: URL) throws -> String {
        let didAccess = url.startAccessingSecurityScopedResource()
        defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
        let storedName = UUID().uuidString + "-" + url.lastPathComponent
        try FileManager.default.copyItem(at: url, to: Self.attachmentURL(named: storedName))
        return storedName
    }

    func attachSyllabus(from url: URL, to courseID: UUID) throws {
        guard let index = courses.firstIndex(where: { $0.id == courseID }) else { return }
        let storedName = try importFile(from: url)
        if let old = courses[index].syllabusFileName {
            Self.deleteAttachmentFile(named: old)
        }
        courses[index].syllabusFileName = storedName
        save()
    }

    func removeSyllabus(from courseID: UUID) {
        guard let index = courses.firstIndex(where: { $0.id == courseID }) else { return }
        if let old = courses[index].syllabusFileName {
            Self.deleteAttachmentFile(named: old)
        }
        courses[index].syllabusFileName = nil
        save()
    }

    func attachFile(from url: URL, to assignmentID: UUID) throws {
        guard let index = assignments.firstIndex(where: { $0.id == assignmentID }) else { return }
        let storedName = try importFile(from: url)
        if let old = assignments[index].attachmentFileName {
            Self.deleteAttachmentFile(named: old)
        }
        assignments[index].attachmentFileName = storedName
        save()
    }

    func removeAssignmentAttachment(id: UUID) {
        guard let index = assignments.firstIndex(where: { $0.id == id }) else { return }
        if let old = assignments[index].attachmentFileName {
            Self.deleteAttachmentFile(named: old)
        }
        assignments[index].attachmentFileName = nil
        save()
    }

    // MARK: - Canvas sync

    struct CanvasSyncSummary {
        var matchedCourses = 0
        var newAssignments = 0
        var updatedAssignments = 0
    }

    @MainActor
    func syncWithCanvas(client: CanvasClient) async throws -> CanvasSyncSummary {
        let canvasCourses = try await client.fetchActiveCourses()
        var summary = CanvasSyncSummary()

        for index in courses.indices {
            guard let match = canvasCourses.first(where: { canvasMatches(course: courses[index], canvas: $0) }) else {
                continue
            }
            courses[index].canvasCourseID = match.id
            summary.matchedCourses += 1

            let canvasAssignments = try await client.fetchAssignments(courseID: match.id)
            for remote in canvasAssignments {
                if let existing = assignments.firstIndex(where: { $0.canvasID == remote.id }) {
                    assignments[existing].title = remote.name
                    assignments[existing].dueDate = remote.dueAt
                    assignments[existing].canvasURL = remote.htmlURL
                    assignments[existing].pointsPossible = remote.pointsPossible
                    summary.updatedAssignments += 1
                } else {
                    assignments.append(Assignment(courseID: courses[index].id,
                                                  title: remote.name,
                                                  dueDate: remote.dueAt,
                                                  canvasID: remote.id,
                                                  canvasURL: remote.htmlURL,
                                                  pointsPossible: remote.pointsPossible))
                    summary.newAssignments += 1
                }
            }
        }

        lastCanvasSync = Date()
        save()
        return summary
    }

    /// Runs a sync using the saved settings and returns a user-facing result message.
    @MainActor
    func runCanvasSync() async -> String {
        guard let client = CanvasClient.fromSettings() else {
            return "Add your Canvas URL and access token in the Settings tab first."
        }
        do {
            let summary = try await syncWithCanvas(client: client)
            if summary.matchedCourses == 0 {
                return "Connected to Canvas, but no courses matched your schedule. Check that your Canvas courses are published."
            }
            return "Matched \(summary.matchedCourses) course\(summary.matchedCourses == 1 ? "" : "s") — \(summary.newAssignments) new and \(summary.updatedAssignments) updated assignments."
        } catch {
            return "Sync failed: \(error.localizedDescription)"
        }
    }

    // MARK: - Persistence

    private struct Snapshot: Codable {
        var courses: [Course]
        var assignments: [Assignment]
        var lastCanvasSync: Date?
    }

    private var saveURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("classcompanion.json")
    }

    func save() {
        let snapshot = Snapshot(courses: courses, assignments: assignments, lastCanvasSync: lastCanvasSync)
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            try encoder.encode(snapshot).write(to: saveURL, options: .atomic)
        } catch {
            print("ClassCompanion: save failed — \(error)")
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: saveURL) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let snapshot = try? decoder.decode(Snapshot.self, from: data) {
            courses = snapshot.courses
            assignments = snapshot.assignments
            lastCanvasSync = snapshot.lastCanvasSync
        }
    }
}
