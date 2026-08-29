import SwiftUI

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @AppStorage(CanvasClient.baseURLDefaultsKey) private var canvasBaseURL = CanvasClient.defaultHost

    @State private var token = ""
    @State private var tokenSavedFlash = false
    @State private var syncing = false
    @State private var syncMessage: String?
    @State private var showingResetConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Canvas URL", text: $canvasBaseURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Access token", text: $token)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button(tokenSavedFlash ? "Saved ✓" : "Save Token") {
                        KeychainHelper.set(token.trimmingCharacters(in: .whitespacesAndNewlines),
                                           forKey: KeychainHelper.canvasTokenKey)
                        tokenSavedFlash = true
                        Task {
                            try? await Task.sleep(nanoseconds: 1_500_000_000)
                            tokenSavedFlash = false
                        }
                    }
                    .disabled(token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button {
                        Task { await runSync() }
                    } label: {
                        HStack {
                            Text(syncing ? "Syncing…" : "Sync Now")
                            if syncing {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }
                    .disabled(syncing)
                    if let last = store.lastCanvasSync {
                        LabeledContent("Last synced",
                                       value: last.formatted(date: .abbreviated, time: .shortened))
                    }
                    Button("Remove saved token", role: .destructive) {
                        KeychainHelper.delete(KeychainHelper.canvasTokenKey)
                        token = ""
                    }
                } header: {
                    Text("Canvas")
                } footer: {
                    Text("To get a token: open Canvas in a browser → Account → Settings → scroll to Approved Integrations → \"+ New Access Token\". Paste it above and tap Save. The token is stored only in this device's Keychain, and the app talks only to your Canvas server. Syncing matches Canvas courses to your schedule by course code and imports their assignments and due dates.")
                }

                Section {
                    LabeledContent("Semester", value: "Fall 2026")
                    LabeledContent("Dates", value: "Aug 24 – Dec 10, 2026")
                    Button("Reset schedule and assignments", role: .destructive) {
                        showingResetConfirm = true
                    }
                } header: {
                    Text("Schedule")
                } footer: {
                    Text("Reset restores the schedule imported from your \"View My Classes\" PDF and removes all assignments and uploaded files.")
                }

                Section("About") {
                    LabeledContent("App", value: "ClassCompanion")
                    LabeledContent("Version", value: "1.0")
                    Text("Built from Connor's Fall 2026 enrollment. Waitlisted sections are not included.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                token = KeychainHelper.get(KeychainHelper.canvasTokenKey) ?? ""
            }
            .alert("Canvas Sync", isPresented: Binding(
                get: { syncMessage != nil },
                set: { if !$0 { syncMessage = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(syncMessage ?? "")
            }
            .confirmationDialog("Reset everything?",
                                isPresented: $showingResetConfirm,
                                titleVisibility: .visible) {
                Button("Reset", role: .destructive) {
                    store.resetToSeed()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes all assignments, syllabi, and uploaded files, and restores the original schedule.")
            }
        }
    }

    private func runSync() async {
        syncing = true
        syncMessage = await store.runCanvasSync()
        syncing = false
    }
}

#Preview {
    SettingsView()
        .environment(AppStore())
}
