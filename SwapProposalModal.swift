import SwiftUI

struct SwapProposal {
    var date: Date
    var start: String
    var end: String
    var postType: String
    var comment: String
    var shiftId: String? = nil
}

struct SwapProposalModal: View {
    @Environment(\.dismiss) var dismiss
    @State var date = Date()
    @State var start = Date()
    @State var end = Calendar.current.date(byAdding: .hour, value: 7, to: Date()) ?? Date()
    @State var postType = "Aide-soignante"
    @State var comment = ""

    var onSend: (SwapProposal) -> Void

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Date")) {
                    DatePicker("Choisir le jour", selection: $date, displayedComponents: .date)
                }
                Section(header: Text("Heures")) {
                    DatePicker("Début", selection: $start, displayedComponents: .hourAndMinute)
                    DatePicker("Fin", selection: $end, displayedComponents: .hourAndMinute)
                }
                Section(header: Text("Poste")) {
                    Picker("Poste", selection: $postType) {
                        Text("Aide-soignante").tag("Aide-soignante")
                        Text("Infirmière").tag("Infirmière")
                        Text("Agent de soins").tag("Agent de soins")
                    }
                    .pickerStyle(.segmented)
                }
                Section(header: Text("Commentaire")) {
                    TextEditor(text: $comment).frame(height:80)
                }
            }
            .navigationTitle("Proposer un échange")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Envoyer") {
                        let fmt = DateFormatter()
                        fmt.dateFormat = "HH:mm"
                        let proposal = SwapProposal(date: date, start: fmt.string(from: start), end: fmt.string(from: end), postType: postType, comment: comment, shiftId: nil)
                        onSend(proposal)
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }
}
