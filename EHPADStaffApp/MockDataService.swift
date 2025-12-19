import Foundation
import Combine

final class MockDataService: ObservableObject {
    static let shared = MockDataService()
    private init() { seed() }

    @Published var shifts: [Shift] = []
    @Published var availabilities: [Availability] = []
    @Published var swapRequests: [SwapRequest] = []
    @Published var messages: [MessageItem] = []
    @Published var leaveRequests: [LeaveRequest] = []
    @Published var overtimeEntries: [OvertimeEntry] = []
    @Published var healthProfiles: [String: HealthProfile] = [:] // keyed by userId

    func seed() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let d1 = formatter.date(from: "2025-11-01") ?? Date()
        let d2 = formatter.date(from: "2025-11-02") ?? Date()
        shifts = [
            Shift(id: "s1", userId: "u1", date: d1, start: "14:00", end: "21:30", note: "Soir"),
            Shift(id: "s2", userId: "u2", date: d1, start: "07:00", end: "14:00", note: "Matin"),
            Shift(id: "s3", userId: "u1", date: d2, start: "07:00", end: "14:00", note: "Matin"),
            Shift(id: "s4", userId: "u2", date: d2, start: "14:00", end: "21:30", note: "Soir")
        ]
    }

    // Swaps
    func requestSwap(requesterId: String, targetId: String, requesterShiftId: String, targetShiftId: String) {
        let req = SwapRequest(id: UUID().uuidString,
                              requesterId: requesterId,
                              targetId: targetId,
                              requesterShiftId: requesterShiftId,
                              targetShiftId: targetShiftId,
                              requestedDate: Date(),
                              state: .requested,
                              approvedByDirection: false)
        swapRequests.append(req)
    }

    func approveSwapByDirection(_ id: String, decidedBy: String) {
        guard let idx = swapRequests.firstIndex(where: { $0.id == id }) else { return }
        swapRequests[idx].approvedByDirection = true
        swapRequests[idx].state = .accepted
        let req = swapRequests[idx]

        if let aIdx = shifts.firstIndex(where: { $0.id == req.requesterShiftId }),
           let bIdx = shifts.firstIndex(where: { $0.id == req.targetShiftId }) {
            let aUser = shifts[aIdx].userId
            let bUser = shifts[bIdx].userId
            shifts[aIdx].userId = bUser
            shifts[bIdx].userId = aUser
        }
    }

    func rejectSwapByDirection(_ id: String, decidedBy: String) {
        guard let idx = swapRequests.firstIndex(where: { $0.id == id }) else { return }
        swapRequests[idx].state = .rejected
        swapRequests[idx].approvedByDirection = false
    }

    // Availability
    func markAvailability(_ avail: Availability) { availabilities.append(avail) }

    // Leave
    func createLeaveRequest(_ req: LeaveRequest) { leaveRequests.append(req) }

    func decideLeave(_ id: String, approved: Bool, decidedBy: String) {
        guard let idx = leaveRequests.firstIndex(where: { $0.id == id }) else { return }
        leaveRequests[idx].state = approved ? .approved : .refused
        leaveRequests[idx].decidedBy = decidedBy
        leaveRequests[idx].decidedAt = Date()
    }

    // Overtime
    func createOvertime(_ entry: OvertimeEntry) { overtimeEntries.append(entry) }

    func decideOvertime(_ id: String, approved: Bool, decidedBy: String) {
        guard let idx = overtimeEntries.firstIndex(where: { $0.id == id }) else { return }
        overtimeEntries[idx].state = approved ? .approved : .refused
        overtimeEntries[idx].decidedBy = decidedBy
        overtimeEntries[idx].decidedAt = Date()
    }

    
// MARK: - Profil & santé
func getHealthProfile(for userId: String) -> HealthProfile {
    if let existing = healthProfiles[userId] { return existing }
    let empty = HealthProfile(userId: userId, birthDate: nil, heightCm: nil, weightKg: nil,
                              allergies: "", treatments: "", bloodType: nil, notes: "",
                              emergencyContact: nil, updatedAt: Date())
    healthProfiles[userId] = empty
    return empty
}

func saveHealthProfile(_ profile: HealthProfile) {
    var p = profile
    p.updatedAt = Date()
    healthProfiles[p.userId] = p
}

// Messaging
    func sendMessage(_ msg: MessageItem) { messages.append(msg) }
}
