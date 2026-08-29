import Foundation
import Security

// MARK: - Canvas data models

struct CanvasCourse: Decodable, Identifiable {
    let id: Int
    let name: String?
    let courseCode: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case courseCode = "course_code"
    }
}

struct CanvasAssignment: Decodable, Identifiable {
    let id: Int
    let name: String
    let dueAt: Date?
    let htmlURL: String?
    let pointsPossible: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case dueAt = "due_at"
        case htmlURL = "html_url"
        case pointsPossible = "points_possible"
    }
}

enum CanvasError: LocalizedError {
    case badURL
    case badResponse
    case unauthorized
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .badURL:
            return "The Canvas URL looks invalid. Check it in Settings."
        case .badResponse:
            return "Canvas returned an unexpected response."
        case .unauthorized:
            return "Canvas rejected the access token. Generate a new token in Canvas and save it in Settings."
        case .http(let code):
            return "Canvas returned an error (HTTP \(code))."
        }
    }
}

// MARK: - Client

struct CanvasClient {
    let baseURL: URL
    let token: String

    static let defaultHost = "https://utah.instructure.com"
    static let baseURLDefaultsKey = "canvasBaseURL"

    /// Builds a client from the saved base URL (UserDefaults) and token (Keychain).
    static func fromSettings() -> CanvasClient? {
        guard let token = KeychainHelper.get(KeychainHelper.canvasTokenKey), !token.isEmpty else {
            return nil
        }
        var host = (UserDefaults.standard.string(forKey: baseURLDefaultsKey) ?? defaultHost)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if host.isEmpty { host = defaultHost }
        if !host.lowercased().hasPrefix("http") { host = "https://" + host }
        while host.hasSuffix("/") { host = String(host.dropLast()) }
        guard let url = URL(string: host) else { return nil }
        return CanvasClient(baseURL: url, token: token)
    }

    func fetchActiveCourses() async throws -> [CanvasCourse] {
        try await get("api/v1/courses", query: [
            URLQueryItem(name: "enrollment_state", value: "active"),
            URLQueryItem(name: "per_page", value: "100"),
        ])
    }

    func fetchAssignments(courseID: Int) async throws -> [CanvasAssignment] {
        try await get("api/v1/courses/\(courseID)/assignments", query: [
            URLQueryItem(name: "per_page", value: "100"),
            URLQueryItem(name: "order_by", value: "due_at"),
        ])
    }

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem]) async throws -> T {
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path),
                                             resolvingAgainstBaseURL: false) else {
            throw CanvasError.badURL
        }
        components.queryItems = query
        guard let url = components.url else { throw CanvasError.badURL }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw CanvasError.badResponse }
        if http.statusCode == 401 { throw CanvasError.unauthorized }
        guard http.statusCode == 200 else { throw CanvasError.http(http.statusCode) }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }
}

// MARK: - Matching Canvas courses to the local schedule

/// True when every token of the local course code ("CVEEN 3410" → "CVEEN", "3410")
/// appears in the Canvas course code or name (handles forms like "CVEEN-3410-001").
func canvasMatches(course: Course, canvas: CanvasCourse) -> Bool {
    let haystack = ((canvas.courseCode ?? "") + " " + (canvas.name ?? ""))
        .uppercased()
        .replacingOccurrences(of: "-", with: " ")
        .replacingOccurrences(of: "_", with: " ")
    let tokens = course.code.uppercased().split(separator: " ").map(String.init)
    guard !tokens.isEmpty else { return false }
    return tokens.allSatisfy { haystack.contains($0) }
}

// MARK: - Keychain

enum KeychainHelper {
    static let canvasTokenKey = "canvasAccessToken"

    static func set(_ value: String, forKey key: String) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(base as CFDictionary)
        guard !value.isEmpty else { return }
        var attributes = base
        attributes[kSecValueData as String] = Data(value.utf8)
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ key: String) {
        set("", forKey: key)
    }
}
