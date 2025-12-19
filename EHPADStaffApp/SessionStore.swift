import Foundation
import Combine

final class SessionStore: ObservableObject {
    @Published var currentUser: User? = nil
    @Published var isLoggedIn: Bool = false
    @Published var users: [User] = []

    init() { seedMock() }

    func seedMock() {
        let u1 = User(id: "u1", name: "Alice", role: .staff, unit: "Unité A", fcmToken: nil)
        let u2 = User(id: "u2", name: "Bob", role: .staff, unit: "Unité A", fcmToken: nil)
        let dir = User(id: "d1", name: "Direction", role: .direction, unit: "Direction", fcmToken: nil)
        users = [u1, u2, dir]
    }

    func login(as userId: String) {
        if let u = users.first(where: { $0.id == userId }) {
            currentUser = u
            isLoggedIn = true
        }
    }

    func logout() {
        currentUser = nil
        isLoggedIn = false
    }
}
