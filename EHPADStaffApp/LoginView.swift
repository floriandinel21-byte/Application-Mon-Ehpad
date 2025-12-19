import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("Connexion EHPAD").font(.largeTitle).bold()
                Text("Mode démo (mock)").foregroundColor(.secondary)

                List(session.users) { u in
                    Button {
                        session.login(as: u.id)
                    } label: {
                        HStack {
                            Image(systemName: u.role == .direction ? "person.crop.circle.fill.badge.checkmark" : "person")
                            VStack(alignment: .leading) {
                                Text(u.name)
                                Text(u.unit).font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }
}
