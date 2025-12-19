import SwiftUI

struct SwapRequestsView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    @State private var selectedMyShiftId: String? = nil
    @State private var selectedColleagueId: String? = nil
    @State private var selectedColleagueShiftId: String? = nil

    @State private var showAlert = false
    @State private var alertText = ""

    var body: some View {
        NavigationView {
            VStack {
                Form {
                    Section("1) Mon horaire à échanger") {
                        Picker("Mon service", selection: $selectedMyShiftId) {
                            Text("—").tag(String?.none)
                            ForEach(myShifts) { s in
                                Text("\(s.date, formatter: shortDate) \(s.start)-\(s.end)").tag(Optional(s.id))
                            }
                        }
                    }

                    Section("2) Choisir le collègue") {
                        Picker("Collègue", selection: $selectedColleagueId) {
                            Text("—").tag(String?.none)
                            ForEach(colleagues) { u in
                                Text(u.name).tag(Optional(u.id))
                            }
                        }
                    }

                    Section("3) Horaire du collègue") {
                        Picker("Son service", selection: $selectedColleagueShiftId) {
                            Text("—").tag(String?.none)
                            ForEach(colleagueShifts) { s in
                                Text("\(s.date, formatter: shortDate) \(s.start)-\(s.end)").tag(Optional(s.id))
                            }
                        }
                        .disabled(selectedColleagueId == nil)
                    }

                    Button("Envoyer la demande à la direction") {
                        guard let me = session.currentUser else { return }
                        guard let myId = selectedMyShiftId,
                              let colId = selectedColleagueId,
                              let colShiftId = selectedColleagueShiftId else {
                            alertText = "Choisis ton horaire, le collègue, et son horaire."
                            showAlert = true
                            return
                        }
                        data.requestSwap(requesterId: me.id, targetId: colId, requesterShiftId: myId, targetShiftId: colShiftId)
                        alertText = "Demande envoyée. La direction doit valider."
                        showAlert = true
                    }
                }
                .alert(alertText, isPresented: $showAlert) { Button("OK", role: .cancel) {} }

                List {
                    Section("Demandes") {
                        ForEach(data.swapRequests.sorted(by: { $0.requestedDate > $1.requestedDate })) { r in
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Demande: \(userName(r.requesterId)) ↔︎ \(userName(r.targetId))")
                                Text("Horaire agent: \(shiftLabel(r.requesterShiftId))")
                                    .font(.caption).foregroundColor(.secondary)
                                Text("Horaire collègue: \(shiftLabel(r.targetShiftId))")
                                    .font(.caption).foregroundColor(.secondary)
                                HStack {
                                    Text(r.state.rawValue.capitalized)
                                    if r.approvedByDirection { Image(systemName: "checkmark.seal.fill").foregroundColor(.green) }
                                }

                                if session.currentUser?.role == .direction && r.state == .requested {
                                    HStack {
                                        Button("Valider") { data.approveSwapByDirection(r.id, decidedBy: session.currentUser?.id ?? "d1") }
                                            .buttonStyle(.borderedProminent)
                                        Button("Refuser") { data.rejectSwapByDirection(r.id, decidedBy: session.currentUser?.id ?? "d1") }
                                            .buttonStyle(.bordered)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Échanges")
        }
    }

    var myShifts: [Shift] {
        guard let uid = session.currentUser?.id else { return [] }
        return data.shifts.filter { $0.userId == uid }.sorted { $0.date > $1.date }
    }

    var colleagues: [User] {
        session.users.filter { $0.role == .staff && $0.id != session.currentUser?.id && $0.unit == session.currentUser?.unit }
    }

    var colleagueShifts: [Shift] {
        guard let colId = selectedColleagueId else { return [] }
        return data.shifts.filter { $0.userId == colId }.sorted { $0.date > $1.date }
    }

    func userName(_ id: String) -> String {
        session.users.first(where: { $0.id == id })?.name ?? id
    }

    func shiftLabel(_ shiftId: String) -> String {
        guard let s = data.shifts.first(where: { $0.id == shiftId }) else { return "—" }
        let f = DateFormatter(); f.dateStyle = .short
        return "\(f.string(from: s.date)) \(s.start)-\(s.end)"
    }

    var shortDate: DateFormatter {
        let f = DateFormatter(); f.dateStyle = .short; return f
    }
}
