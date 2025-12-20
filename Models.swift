import Foundation
import SwiftUI

enum Role: String, Codable { case staff, direction }

struct User: Identifiable, Codable {
    var id: String
    var name: String
    var role: Role
    var unit: String
    var fcmToken: String?
}

struct Shift: Identifiable, Codable {
    var id: String
    var userId: String
    var date: Date
    var start: String
    var end: String
    var note: String?
}

enum AvailabilityStatus: String, Codable { case available, unavailable, sick }

struct Availability: Identifiable, Codable {
    var id = UUID().uuidString
    var userId: String
    var from: Date
    var to: Date
    var status: AvailabilityStatus
    var note: String?
}

enum SwapState: String, Codable { case requested, accepted, rejected }

struct SwapRequest: Identifiable, Codable {
    var id: String
    var requesterId: String
    var targetId: String
    var requesterShiftId: String
    var targetShiftId: String
    var requestedDate: Date
    var state: SwapState
    var approvedByDirection: Bool = false
}

struct MessageItem: Identifiable, Codable {
    var id = UUID().uuidString
    var fromId: String
    var toId: String
    var content: String
    var createdAt: Date = Date()
    var attachmentName: String?
    var attachmentUrl: String?
}

enum LeaveType: String, Codable {
    case paidLeave = "Congés payés"
    case unpaidLeave = "Congé sans solde"
    case sickLeave = "Arrêt maladie"
    case other = "Autre"
}

enum LeaveState: String, Codable { case pending = "En attente", approved = "Approuvé", refused = "Refusé" }

struct LeaveRequest: Identifiable, Codable {
    var id = UUID().uuidString
    var userId: String
    var type: LeaveType
    var from: Date
    var to: Date
    var note: String?
    var state: LeaveState = .pending
    var decidedBy: String? = nil
    var decidedAt: Date? = nil
}

enum OvertimeState: String, Codable { case pending = "En attente", approved = "Validé", refused = "Refusé" }

struct OvertimeEntry: Identifiable, Codable {
    var id = UUID().uuidString
    var userId: String
    var shiftId: String?
    var date: Date
    var minutes: Int
    var note: String?
    var state: OvertimeState = .pending
    var decidedBy: String? = nil
    var decidedAt: Date? = nil
}

struct EmergencyContact: Codable {
    var name: String
    var phone: String
}

struct HealthProfile: Identifiable, Codable {
    var id: String { userId }
    var userId: String

    var birthDate: Date?
    var heightCm: Int?
    var weightKg: Double?

    var allergies: String
    var treatments: String
    var bloodType: String?
    var notes: String

    var emergencyContact: EmergencyContact?

    var updatedAt: Date = Date()
}
