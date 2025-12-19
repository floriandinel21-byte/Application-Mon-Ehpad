import SwiftUI

struct PersonnelView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    @State private var selectedShiftId: String? = nil
    @State private var minutes: Int = 15
    @State private var note: String = ""
    @State private var showSaved = false

    var body: some View {
        NavigationView {
            Form {
                Section("Déclarer heures supplémentaires") {
                    Picker("Sur quel service ?", selection: $selectedShiftId) {
                        Text("—").tag(String?.none)
                        ForEach(myShifts) { s in
                            Text("\(s.date, formatter: shortDate) \(s.start)-\(s.end)").tag(Optional(s.id))
                        }
                    }
                    Picker("Durée", selection: $minutes) {
                        Text("15 min").tag(15)
                        Text("30 min").tag(30)
                        Text("45 min").tag(45)
                        Text("60 min").tag(60)
                    }
                    TextField("Commentaire (optionnel)", text: $note)
                    Button("Envoyer à la direction") {
                        guard let uid = session.currentUser?.id else { return }
                        let entry = OvertimeEntry(userId: uid, shiftId: selectedShiftId, date: Date(), minutes: minutes, note: note)
                        data.createOvertime(entry)
                        note = ""
                        showSaved = true
                    }
                }

                Section("Mes heures supp") {
                    ForEach(data.overtimeEntries.filter { $0.userId == session.currentUser?.id }
                        .sorted(by: { $0.date > $1.date })) { e in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(e.minutes) minutes — \(e.state.rawValue)")
                            Text(e.date, formatter: fullDate).font(.caption).foregroundColor(.secondary)
                            if let n = e.note, !n.isEmpty { Text(n).font(.caption).foregroundColor(.secondary) }
                        }
                    }
                }

                if session.currentUser?.role == .direction {
                    Section("Validation direction — Heures supp") {
                        ForEach(data.overtimeEntries.filter { $0.state == .pending }
                            .sorted(by: { $0.date > $1.date })) { e in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("\(userName(e.userId)) — \(e.minutes) min")
                                Text(e.date, formatter: fullDate).font(.caption).foregroundColor(.secondary)
                                HStack {
                                    Button("Valider") {
                                        data.decideOvertime(e.id, approved: true, decidedBy: session.currentUser?.id ?? "d1")
                                    }
                                    .buttonStyle(.borderedProminent)
                                    Button("Refuser") {
                                        data.decideOvertime(e.id, approved: false, decidedBy: session.currentUser?.id ?? "d1")
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Personnel")
            .alert("Envoyé", isPresented: $showSaved) { Button("OK", role: .cancel) {} }
        }
    }

    var myShifts: [Shift] {
        data.shifts.filter { $0.userId == session.currentUser?.id }.sorted { $0.date > $1.date }
    }

    func userName(_ id: String) -> String {
        session.users.first(where: { $0.id == id })?.name ?? id
    }

    var shortDate: DateFormatter {
        let f = DateFormatter(); f.dateStyle = .short; return f
    }
    var fullDate: DateFormatter {
        let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .short; return f
    }
}
