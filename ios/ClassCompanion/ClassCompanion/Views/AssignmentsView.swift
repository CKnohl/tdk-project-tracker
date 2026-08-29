import SwiftUI
import QuickLook
import UniformTypeIdentifiers

struct AssignmentsView: View {
    @Environment(AppStore.self) private var store
    @State private var showingAdd = false
    @State private var syncing = false
    @State private var syncMessage: String?

    var body: some View {
        NavigationStack {
            List {
                ForEach(groups(now: Date()), id: \.title) { group in
                    Section(group.title) {
                        ForEach(group.items) { assignment in
                            NavigationLink {
                                AssignmentDetailView(assignmentID: assignment.id)
                            } label: {
                                AssignmentRow(assignment: assignment)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    store.deleteAssignment(id: assignment.id)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .overlay {
                if store.assignments.isEmpty {
                    ContentUnavailableView {
                        Label("No assignments yet", systemImage: "checklist")
                    } description: {
                        Text("Add one with the + button, or link Canvas in Settings and tap sync to pull them in automatically.")
                    }
                }
            }
            .navigationTitle("Assignments")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await runSync() }
                    } label: {
                        if syncing {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                    }
                    .disabled(syncing)
                    .accessibilityLabel("Sync with Canvas")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add assignment")
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddAssignmentView()
            }
            .alert("Canvas Sync", isPresented: syncAlertBinding) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(syncMessage ?? "")
            }
        }
    }

    private var syncAlertBinding: Binding<Bool> {
        Binding(get: { syncMessage != nil }, set: { if !$0 { syncMessage = nil } })
    }

    private func runSync() async {
        syncing = true
        syncMessage = await store.runCanvasSync()
        syncing = false
    }

    // MARK: - Grouping

    private struct AssignmentGroup {
        let title: String
        let items: [Assignment]
    }

    private func groups(now: Date) -> [AssignmentGroup] {
        let calendar = Calendar.current
        let active = store.assignments
            .filter { !$0.isCompleted }
            .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
        let completed = store.assignments
            .filter(\.isCompleted)
            .sorted { ($0.dueDate ?? .distantFuture) > ($1.dueDate ?? .distantFuture) }

        var overdue: [Assignment] = []
        var today: [Assignment] = []
        var thisWeek: [Assignment] = []
        var later: [Assignment] = []
        var noDue: [Assignment] = []

        for assignment in active {
            guard let due = assignment.dueDate else {
                noDue.append(assignment)
                continue
            }
            if due < now {
                overdue.append(assignment)
            } else if calendar.isDateInToday(due) {
                today.append(assignment)
            } else if let weekEnd = calendar.date(byAdding: .day, value: 7, to: now), due <= weekEnd {
                thisWeek.append(assignment)
            } else {
                later.append(assignment)
            }
        }

        var result: [AssignmentGroup] = []
        if !overdue.isEmpty { result.append(AssignmentGroup(title: "Overdue", items: overdue)) }
        if !today.isEmpty { result.append(AssignmentGroup(title: "Due Today", items: today)) }
        if !thisWeek.isEmpty { result.append(AssignmentGroup(title: "This Week", items: thisWeek)) }
        if !later.isEmpty { result.append(AssignmentGroup(title: "Later", items: later)) }
        if !noDue.isEmpty { result.append(AssignmentGroup(title: "No Due Date", items: noDue)) }
        if !completed.isEmpty { result.append(AssignmentGroup(title: "Completed", items: completed)) }
        return result
    }
}

// MARK: - Row

struct AssignmentRow: View {
    @Environment(AppStore.self) private var store
    let assignment: Assignment

    init(assignment: Assignment) {
        self.assignment = assignment
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Button {
                store.toggleComplete(id: assignment.id)
            } label: {
                Image(systemName: assignment.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(assignment.isCompleted ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                Text(assignment.title)
                    .strikethrough(assignment.isCompleted)
                    .foregroundStyle(assignment.isCompleted ? .secondary : .primary)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    if let course = store.course(id: assignment.courseID) {
                        CourseChip(course: course)
                    }
                    if let due = assignment.dueDate {
                        Text(dueLabel(due))
                            .font(.caption)
                            .foregroundStyle(dueColor(due, completed: assignment.isCompleted))
                    }
                    if assignment.canvasID != nil {
                        Image(systemName: "link")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
    }
}

// MARK: - Add form

struct AddAssignmentView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let defaultCourseID: UUID?

    @State private var title = ""
    @State private var selectedCourseID: UUID?
    @State private var hasDueDate = true
    @State private var dueDate = Date().addingTimeInterval(86400)
    @State private var notes = ""

    init(defaultCourseID: UUID? = nil) {
        self.defaultCourseID = defaultCourseID
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Assignment title", text: $title)
                    Picker("Course", selection: $selectedCourseID) {
                        ForEach(store.courses) { course in
                            Text(course.code).tag(Optional(course.id))
                        }
                    }
                }
                Section {
                    Toggle("Due date", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                    }
                }
                Section("Notes") {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("New Assignment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        guard let courseID = selectedCourseID else { return }
                        store.addAssignment(Assignment(courseID: courseID,
                                                       title: title.trimmingCharacters(in: .whitespaces),
                                                       details: notes,
                                                       dueDate: hasDueDate ? dueDate : nil))
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || selectedCourseID == nil)
                }
            }
            .onAppear {
                if selectedCourseID == nil {
                    selectedCourseID = defaultCourseID ?? store.courses.first?.id
                }
            }
        }
    }
}

// MARK: - Detail

struct AssignmentDetailView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let assignmentID: UUID

    @State private var showingImporter = false
    @State private var previewURL: URL?
    @State private var importError: String?

    init(assignmentID: UUID) {
        self.assignmentID = assignmentID
    }

    var body: some View {
        if let assignment = store.assignment(id: assignmentID) {
            let binding = Binding(
                get: { store.assignment(id: assignmentID) ?? assignment },
                set: { store.updateAssignment($0) }
            )
            Form {
                Section("Assignment") {
                    TextField("Title", text: binding.title)
                    LabeledContent("Course", value: store.course(id: assignment.courseID)?.code ?? "—")
                    Toggle("Completed", isOn: binding.isCompleted)
                    if let points = assignment.pointsPossible {
                        LabeledContent("Points", value: points.formatted())
                    }
                }
                Section("Due date") {
                    Toggle("Has due date", isOn: Binding(
                        get: { binding.wrappedValue.dueDate != nil },
                        set: { on in
                            var updated = binding.wrappedValue
                            updated.dueDate = on ? (updated.dueDate ?? Date()) : nil
                            binding.wrappedValue = updated
                        }
                    ))
                    if assignment.dueDate != nil {
                        DatePicker("Due", selection: Binding(
                            get: { store.assignment(id: assignmentID)?.dueDate ?? Date() },
                            set: { newDate in
                                var updated = binding.wrappedValue
                                updated.dueDate = newDate
                                binding.wrappedValue = updated
                            }
                        ), displayedComponents: [.date, .hourAndMinute])
                    }
                }
                Section("Notes") {
                    TextField("Notes", text: binding.details, axis: .vertical)
                        .lineLimit(3...8)
                }
                if let urlString = assignment.canvasURL, let url = URL(string: urlString) {
                    Section("Canvas") {
                        Link(destination: url) {
                            Label("Open in Canvas", systemImage: "safari")
                        }
                    }
                }
                Section("Attachment") {
                    if let name = assignment.attachmentFileName {
                        Button {
                            previewURL = AppStore.attachmentURL(named: name)
                        } label: {
                            Label(attachmentDisplayName(name), systemImage: "doc.fill")
                        }
                        Button("Remove attachment", role: .destructive) {
                            store.removeAssignmentAttachment(id: assignmentID)
                        }
                    } else {
                        Button {
                            showingImporter = true
                        } label: {
                            Label("Add file", systemImage: "paperclip")
                        }
                    }
                }
                Section {
                    Button("Delete Assignment", role: .destructive) {
                        store.deleteAssignment(id: assignmentID)
                        dismiss()
                    }
                }
            }
            .navigationTitle("Assignment")
            .navigationBarTitleDisplayMode(.inline)
            .fileImporter(isPresented: $showingImporter,
                          allowedContentTypes: [UTType.pdf, .image, .content]) { result in
                switch result {
                case .success(let url):
                    do {
                        try store.attachFile(from: url, to: assignmentID)
                    } catch {
                        importError = error.localizedDescription
                    }
                case .failure(let error):
                    importError = error.localizedDescription
                }
            }
            .quickLookPreview($previewURL)
            .alert("Couldn't import file", isPresented: Binding(
                get: { importError != nil },
                set: { if !$0 { importError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importError ?? "")
            }
        } else {
            ContentUnavailableView("Assignment removed", systemImage: "trash")
        }
    }
}

#Preview {
    AssignmentsView()
        .environment(AppStore())
}
