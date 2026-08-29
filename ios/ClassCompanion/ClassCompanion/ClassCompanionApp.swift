import SwiftUI

@main
struct ClassCompanionApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
        }
    }
}

struct ContentView: View {
    var body: some View {
        TabView {
            NowView()
                .tabItem { Label("Now", systemImage: "clock.fill") }
            WeekView()
                .tabItem { Label("Schedule", systemImage: "calendar") }
            AssignmentsView()
                .tabItem { Label("Assignments", systemImage: "checklist") }
            CoursesView()
                .tabItem { Label("Courses", systemImage: "books.vertical.fill") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
    }
}

#Preview {
    ContentView()
        .environment(AppStore())
}
