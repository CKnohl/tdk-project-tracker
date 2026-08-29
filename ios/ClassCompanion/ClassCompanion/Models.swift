import Foundation

// MARK: - Weekday

/// Raw values match `Calendar.component(.weekday, from:)` (Sunday = 1 ... Saturday = 7).
enum Weekday: Int, Codable, CaseIterable, Identifiable, Comparable {
    case sunday = 1
    case monday = 2
    case tuesday = 3
    case wednesday = 4
    case thursday = 5
    case friday = 6
    case saturday = 7

    var id: Int { rawValue }

    /// Monday-first ordering for display.
    var orderIndex: Int { (rawValue + 5) % 7 }

    static func < (lhs: Weekday, rhs: Weekday) -> Bool {
        lhs.orderIndex < rhs.orderIndex
    }

    var fullName: String {
        switch self {
        case .sunday: return "Sunday"
        case .monday: return "Monday"
        case .tuesday: return "Tuesday"
        case .wednesday: return "Wednesday"
        case .thursday: return "Thursday"
        case .friday: return "Friday"
        case .saturday: return "Saturday"
        }
    }

    var veryShortName: String {
        switch self {
        case .sunday: return "Su"
        case .monday: return "M"
        case .tuesday: return "Tu"
        case .wednesday: return "W"
        case .thursday: return "Th"
        case .friday: return "F"
        case .saturday: return "Sa"
        }
    }

    static var schoolWeek: [Weekday] { [.monday, .tuesday, .wednesday, .thursday, .friday] }

    static var current: Weekday {
        Weekday(rawValue: Calendar.current.component(.weekday, from: Date())) ?? .monday
    }

    static var currentOrMonday: Weekday {
        let today = current
        return (today == .saturday || today == .sunday) ? .monday : today
    }

    var isToday: Bool { self == Weekday.current }
}

// MARK: - Schedule types

struct ClassMeeting: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var days: [Weekday]
    var startMinutes: Int   // minutes after midnight, e.g. 8:35 AM = 515
    var endMinutes: Int
    var room: String

    /// "MWF", "TuTh"
    var daysString: String {
        days.sorted().map(\.veryShortName).joined()
    }
}

struct Course: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var code: String            // "CVEEN 3410"
    var title: String           // "Hydraulics"
    var units: Double
    var isOnline: Bool = false
    var meetings: [ClassMeeting] = []
    var colorIndex: Int = 0
    var canvasCourseID: Int? = nil
    var syllabusFileName: String? = nil
}

struct Assignment: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var courseID: UUID
    var title: String
    var details: String = ""
    var dueDate: Date? = nil
    var isCompleted: Bool = false
    var canvasID: Int? = nil
    var canvasURL: String? = nil
    var pointsPossible: Double? = nil
    var attachmentFileName: String? = nil
}

/// A concrete occurrence of a class meeting on a specific date.
struct MeetingInstance: Identifiable {
    let course: Course
    let meeting: ClassMeeting
    let start: Date
    let end: Date

    var id: String { "\(course.id.uuidString)-\(meeting.id.uuidString)-\(start.timeIntervalSinceReferenceDate)" }
}

/// A meeting on a given weekday, independent of any specific date (used by the week view).
struct DayEntry: Identifiable {
    let course: Course
    let meeting: ClassMeeting

    var id: String { "\(course.id.uuidString)-\(meeting.id.uuidString)" }
}
