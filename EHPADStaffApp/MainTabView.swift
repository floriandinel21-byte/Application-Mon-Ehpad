import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var session: SessionStore
    @StateObject private var data = MockDataService.shared

    var body: some View {
        TabView {
            PlanningView()
                .tabItem { Label("Planning", systemImage: "calendar") }
                .environmentObject(session)
                .environmentObject(data)

            SwapRequestsView()
                .tabItem { Label("Échanges", systemImage: "arrow.2.squarepath") }
                .environmentObject(session)
                .environmentObject(data)

            AvailabilityView()
                .tabItem { Label("Dispo", systemImage: "person.fill.questionmark") }
                .environmentObject(session)
                .environmentObject(data)

            EnhancedMessagingView()
                .tabItem { Label("Messages", systemImage: "message") }
                .environmentObject(session)
                .environmentObject(data)

            PersonnelView()
                .tabItem { Label("Personnel", systemImage: "person.text.rectangle") }
                .environmentObject(session)
                .environmentObject(data)

            AbsencesCongesView()
                .tabItem { Label("Absences", systemImage: "cross.case") }
                .environmentObject(session)
                .environmentObject(data)

            ContactsView()
                .tabItem { Label("Contacts", systemImage: "phone") }
                .environmentObject(session)
        }
    }
}
