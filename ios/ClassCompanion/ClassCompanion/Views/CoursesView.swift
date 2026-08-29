import SwiftUI
import QuickLook
import UniformTypeIdentifiers

struct CoursesView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            List(store.courses) { course in
                NavigationLink {
                    CourseDetailView(courseID: course.id)
                } label: {
                    CourseRow(course: course)
                }
            }
            .navigationTitle("Courses")
        }
    }
}

struct CourseRow: View {
    let course: Course

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(courseColor(course.colorIndex))
                .frame(width: 12, height: 12)
                .padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(course.code)
                    .font(.headline)
                Text(course.title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if course.isOnline {
                    Text("Online · asynchronous")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(course.meetings) { meeting in
                        Text("\(meeting.daysString) \(timeRangeString(meeting)) · \(meeting.room)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            Spacer()
            Text("\(course.units.formatted()) cr")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }
}

struct CourseDetailView: View {
    @Environment(AppStore.self) private var store
    let courseID: UUID

    @State private var showingSyllabusImporter = false
    @State private var previewURL: URL?
    @State private var showingAddAssignment = false
    @State private var importError: String?

    init(courseID: UUID) {
        self.courseID = courseID
    }

    var body: some View {
        if let course = store.course(id: courseID) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(course.title)
                            .font(.title3.bold())
                        HStack(spacing: 12) {
                            CourseChip(course: course)
                            Text("\(course.units.formatted()) credit\(course.units == 1 ? "" : "s")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Meetings") {
                    if course.isOnline {
                        Label("Online — asynchronous", systemImage: "wifi")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(course.meetings) { meeting in
                            HStack {
                                Text(meeting.daysString)
                                    .font(.subheadline.weight(.semibold))
                                    .frame(width: 52, alignment: .leading)
                                Text(timeRangeString(meeting))
                                    .font(.subheadline)
                                Spacer()
                                Text(meeting.room)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section("Syllabus") {
                    if let name = course.syllabusFileName {
                        Button {
                            previewURL = AppStore.attachmentURL(named: name)
                        } label: {
                            Label(attachmentDisplayName(name), systemImage: "doc.text.fill")
                        }
                        Button("Replace syllabus") {
                            showingSyllabusImporter = true
                        }
                        Button("Remove syllabus", role: .destructive) {
                            store.removeSyllabus(from: courseID)
                        }
                    } else {
                        Button {
                            showingSyllabusImporter = true
                        } label: {
                            Label("Upload syllabus", systemImage: "square.and.arrow.down")
                        }
                    }
                }

                Section("Assignments") {
                    let items = store.assignments
                        .filter { $0.courseID == courseID }
                        .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
                    if items.isEmpty {
                        Text("No assignments yet")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(items) { assignment in
                        NavigationLink {
                            AssignmentDetailView(assignmentID: assignment.id)
                        } label: {
                            AssignmentRow(assignment: assignment)
                        }
                    }
                    Button {
                        showingAddAssignment = true
                    } label: {
                        Label("Add assignment", systemImage: "plus")
                    }
                }

                Section("Canvas") {
                    if let canvasID = course.canvasCourseID {
                        LabeledContent("Linked course ID", value: String(canvasID))
                    } else {
                        Text("Not linked yet — save your Canvas token in Settings, then run a sync.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(course.code)
            .navigationBarTitleDisplayMode(.inline)
            .fileImporter(isPresented: $showingSyllabusImporter,
                          allowedContentTypes: [UTType.pdf, .image, .content]) { result in
                switch result {
                case .success(let url):
                    do {
                        try store.attachSyllabus(from: url, to: courseID)
                    } catch {
                        importError = error.localizedDescription
                    }
                case .failure(let error):
                    importError = error.localizedDescription
                }
            }
            .quickLookPreview($previewURL)
            .sheet(isPresented: $showingAddAssignment) {
                AddAssignmentView(defaultCourseID: courseID)
            }
            .alert("Couldn't import file", isPresented: Binding(
                get: { importError != nil },
                set: { if !$0 { importError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importError ?? "")
            }
        } else {
            ContentUnavailableView("Course not found", systemImage: "questionmark.circle")
        }
    }
}

#Preview {
    CoursesView()
        .environment(AppStore())
}
