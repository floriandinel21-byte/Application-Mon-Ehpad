import SwiftUI

struct ProfilSanteView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    var body: some View {
        NavigationView {
            Group {
                if session.currentUser?.role == .direction {
                    DirectionProfilesListView()
                } else {
                    MyProfileHealthEditorView(userId: session.currentUser?.id ?? "")
                }
            }
            .navigationTitle("Profil & santé")
        }
    }
}

// MARK: - Staff (edit own)
struct MyProfileHealthEditorView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    let userId: String

    @State private var profile = HealthProfile(userId: "", birthDate: nil, heightCm: nil, weightKg: nil, allergies: "", treatments: "", bloodType: nil, notes: "", emergencyContact: nil, updatedAt: Date())
    @State private var showSaved = false

    var body: some View {
        Form {
            Section {
                Text("Ces informations sont utilisées uniquement en cas de nécessité médicale.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }

            Section("Informations personnelles") {
                HStack {
                    Text("Nom")
                    Spacer()
                    Text(session.currentUser?.name ?? "—").foregroundColor(.secondary)
                }
                DatePicker("Date de naissance", selection: birthDateBinding, displayedComponents: .date)

                Stepper(value: heightBinding, in: 120...220, step: 1) {
                    HStack { Text("Taille"); Spacer(); Text("\(profile.heightCm ?? 170) cm").foregroundColor(.secondary) }
                }
                Stepper(value: weightBinding, in: 35...200, step: 0.5) {
                    HStack { Text("Poids"); Spacer(); Text(String(format: "%.1f kg", profile.weightKg ?? 70.0)).foregroundColor(.secondary) }
                }
            }

            Section("Informations santé") {
                TextField("Allergies", text: $profile.allergies, axis: .vertical)
                TextField("Traitements / médicaments", text: $profile.treatments, axis: .vertical)
                TextField("Groupe sanguin (optionnel)", text: bloodTypeBinding)
                TextField("Notes", text: $profile.notes, axis: .vertical)
            }

            Section("Contact d'urgence") {
                TextField("Nom", text: emergencyNameBinding)
                TextField("Téléphone", text: emergencyPhoneBinding)
                    .keyboardType(.phonePad)
            }

            Section {
                Button("Enregistrer") {
                    data.saveHealthProfile(profile)
                    showSaved = true
                }
                .buttonStyle(.borderedProminent)

                Text("Dernière mise à jour : \(profile.updatedAt.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .onAppear { profile = data.getHealthProfile(for: userId) }
        .alert("Enregistré", isPresented: $showSaved) { Button("OK", role: .cancel) {} }
    }

    var birthDateBinding: Binding<Date> {
        Binding(get: { profile.birthDate ?? Date() }, set: { profile.birthDate = $0 })
    }
    var heightBinding: Binding<Int> {
        Binding(get: { profile.heightCm ?? 170 }, set: { profile.heightCm = $0 })
    }
    var weightBinding: Binding<Double> {
        Binding(get: { profile.weightKg ?? 70.0 }, set: { profile.weightKg = $0 })
    }
    var bloodTypeBinding: Binding<String> {
        Binding(get: { profile.bloodType ?? "" }, set: { profile.bloodType = $0.isEmpty ? nil : $0 })
    }
    var emergencyNameBinding: Binding<String> {
        Binding(get: { profile.emergencyContact?.name ?? "" }, set: { newVal in
            let phone = profile.emergencyContact?.phone ?? ""
            if newVal.isEmpty && phone.isEmpty { profile.emergencyContact = nil }
            else { profile.emergencyContact = EmergencyContact(name: newVal, phone: phone) }
        })
    }
    var emergencyPhoneBinding: Binding<String> {
        Binding(get: { profile.emergencyContact?.phone ?? "" }, set: { newVal in
            let name = profile.emergencyContact?.name ?? ""
            if newVal.isEmpty && name.isEmpty { profile.emergencyContact = nil }
            else { profile.emergencyContact = EmergencyContact(name: name, phone: newVal) }
        })
    }
}

// MARK: - Direction (read-only)
struct DirectionProfilesListView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    @State private var selectedUser: User?

    var body: some View {
        List {
            Section {
                Text("Accès réservé à la direction. Consultation uniquement.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
            Section("Personnel") {
                ForEach(session.users.filter { $0.role == .staff }) { u in
                    Button {
                        selectedUser = u
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(u.name)
                                Text(u.unit).font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .sheet(item: $selectedUser) { u in
            DirectionReadOnlyProfileView(user: u)
                .environmentObject(data)
        }
    }
}

struct DirectionReadOnlyProfileView: View {
    @EnvironmentObject var data: MockDataService
    let user: User

    var body: some View {
        let p = data.getHealthProfile(for: user.id)
        NavigationView {
            List {
                Section("Identité") {
                    row("Nom", user.name)
                    row("Unité", user.unit)
                }
                Section("Informations personnelles") {
                    row("Date de naissance", p.birthDate?.formatted(date: .abbreviated, time: .omitted) ?? "—")
                    row("Taille", p.heightCm != nil ? "\(p.heightCm!) cm" : "—")
                    row("Poids", p.weightKg != nil ? String(format: "%.1f kg", p.weightKg!) : "—")
                }
                Section("Santé") {
                    row("Allergies", p.allergies.isEmpty ? "—" : p.allergies)
                    row("Traitements", p.treatments.isEmpty ? "—" : p.treatments)
                    row("Groupe sanguin", (p.bloodType?.isEmpty ?? true) ? "—" : (p.bloodType ?? "—"))
                    row("Notes", p.notes.isEmpty ? "—" : p.notes)
                }
                Section("Contact d'urgence") {
                    row("Nom", p.emergencyContact?.name.isEmpty == false ? (p.emergencyContact?.name ?? "—") : "—")
                    row("Téléphone", p.emergencyContact?.phone.isEmpty == false ? (p.emergencyContact?.phone ?? "—") : "—")
                }
                Section {
                    Text("Dernière mise à jour : \(p.updatedAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Profil & santé")
        }
    }

    func row(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value).foregroundColor(.secondary).multilineTextAlignment(.trailing)
        }
    }
}
