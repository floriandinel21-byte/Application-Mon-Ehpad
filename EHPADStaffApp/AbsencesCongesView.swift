import SwiftUI

struct AbsencesCongesView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    @State private var type: LeaveType = .paidLeave
    @State private var from = Date()
    @State private var to = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    @State private var note: String = ""
    @State private var showSaved = false

    var body: some View {
        NavigationView {
            Form {
                Section("Déclarer une absence / demande de congé") {
                    Picker("Type", selection: $type) {
                        Text(LeaveType.paidLeave.rawValue).tag(LeaveType.paidLeave)
                        Text(LeaveType.unpaidLeave.rawValue).tag(LeaveType.unpaidLeave)
                        Text(LeaveType.sickLeave.rawValue).tag(LeaveType.sickLeave)
                        Text(LeaveType.other.rawValue).tag(LeaveType.other)
                    }
                    DatePicker("Du", selection: $from, displayedComponents: [.date, .hourAndMinute])
                    DatePicker("Au", selection: $to, displayedComponents: [.date, .hourAndMinute])
                    TextField("Commentaire (optionnel)", text: $note)
                    Button("Envoyer à la direction") {
                        guard let uid = session.currentUser?.id else { return }
                        let req = LeaveRequest(userId: uid, type: type, from: from, to: to, note: note, state: .pending)
                        data.createLeaveRequest(req)
                        note = ""
                        showSaved = true
                    }
                }

                Section("Mes demandes") {
                    ForEach(data.leaveRequests.filter { $0.userId == session.currentUser?.id }
                        .sorted(by: { $0.from > $1.from })) { r in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(r.type.rawValue) — \(r.state.rawValue)")
                            Text("\(r.from, formatter: fullDate) → \(r.to, formatter: fullDate)")
                                .font(.caption).foregroundColor(.secondary)
                            if let n = r.note, !n.isEmpty { Text(n).font(.caption).foregroundColor(.secondary) }
                        }
                    }
                }

                if session.currentUser?.role == .direction {
                    Section("Validation direction — Absences/Congés") {
                        ForEach(data.leaveRequests.filter { $0.state == .pending }
                            .sorted(by: { $0.from > $1.from })) { r in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("\(userName(r.userId)) — \(r.type.rawValue)")
                                Text("\(r.from, formatter: fullDate) → \(r.to, formatter: fullDate)")
                                    .font(.caption).foregroundColor(.secondary)
                                HStack {
                                    Button("Valider") {
                                        data.decideLeave(r.id, approved: true, decidedBy: session.currentUser?.id ?? "d1")
                                    }
                                    .buttonStyle(.borderedProminent)
                                    Button("Refuser") {
                                        data.decideLeave(r.id, approved: false, decidedBy: session.currentUser?.id ?? "d1")
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Absences & congés")
            .alert("Envoyé", isPresented: $showSaved) { Button("OK", role: .cancel) {} }
        }
    }

    func userName(_ id: String) -> String {
        session.users.first(where: { $0.id == id })?.name ?? id
    }

    var fullDate: DateFormatter {
        let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .short; return f
    }
}
