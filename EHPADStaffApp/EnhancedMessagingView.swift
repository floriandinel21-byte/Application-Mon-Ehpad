import SwiftUI

// Enhanced messaging UI with iMessage-like bubbles and a Swap Proposal modal (calendar + time)
struct EnhancedMessagingView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    @State private var selectedConversationId: String? = nil
    @State private var showNewConversation = false
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            VStack {
                HStack {
                    TextField("Rechercher...", text: $searchText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    Button(action: { showNewConversation.toggle() }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
                .padding(.horizontal)
                List {
                    ForEach(conversationsFiltered) { convo in
                        Button(action: { selectedConversationId = convo.id }) {
                            HStack {
                                if let user = session.users.first(where: { $0.id == convo.peerId }) {
                                    ProfileCircle(name: user.name)
                                } else {
                                    Circle().frame(width:40, height:40).foregroundColor(.gray)
                                }
                                VStack(alignment: .leading) {
                                    Text(convo.title).font(.headline)
                                    Text(convo.lastMessagePreview).font(.subheadline).foregroundColor(.secondary)
                                }
                                Spacer()
                                Text(convo.lastTimestamp, style: .time).font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Messagerie")
            .sheet(item: $selectedConversationId) { id in
                ChatView(conversationId: id)
                    .environmentObject(session)
                    .environmentObject(data)
            }
            .sheet(isPresented: $showNewConversation) {
                NewConversationView { peerId in
                    // create minimal conversation if necessary and open chat
                    if let _ = session.users.first(where: { $0.id == peerId }) {
                        selectedConversationId = peerId
                    }
                    showNewConversation = false
                }
            }
        }
    }

    var conversationsFiltered: [ConversationPreview] {
        // Build list from messages
        var previews: [ConversationPreview] = []
        for u in session.users where u.id != session.currentUser?.id {
            let messages = data.messages.filter { $0.fromId == u.id || $0.toId == u.id }
            let sorted = messages.sorted { $0.createdAt > $1.createdAt }
            let last = sorted.first
            let preview = ConversationPreview(id: u.id, peerId: u.id, title: u.name, lastMessagePreview: last?.content ?? "Pas encore de message", lastTimestamp: last?.createdAt ?? Date())
            previews.append(preview)
        }
        // filter by search
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return previews
        } else {
            return previews.filter { $0.title.lowercased().contains(searchText.lowercased()) }
        }
    }
}

struct ConversationPreview: Identifiable {
    var id: String
    var peerId: String
    var title: String
    var lastMessagePreview: String
    var lastTimestamp: Date
}

struct ProfileCircle: View {
    var name: String
    var body: some View {
        ZStack {
            Circle().fill(Color.gray.opacity(0.2)).frame(width:44, height:44)
            Text(String(name.prefix(1))).bold()
        }
    }
}

// Chat view with bubbles and swap proposal integration
struct ChatView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var data: MockDataService

    var conversationId: String // peer id for simplicity

    @State private var messageText: String = ""
    @State private var showPicker = false
    @State private var showSwapModal = false

    var body: some View {
        VStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(messagesSorted) { m in
                            MessageBubble(message: m, isMe: m.fromId == session.currentUser?.id)
                                .id(m.id)
                                .contextMenu {
                                    if m.content == "[SWAP_PROPOSAL]" {
                                        Button("Voir la proposition") {
                                            // show swap details - in a real app parse attachment or linked swapId
                                        }
                                    }
                                }
                        }
                    }
                    .padding()
                }
                .onChange(of: data.messages.count) { _ in
                    if let last = messagesSorted.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }

            HStack {
                Button(action: { showSwapModal = true }) {
                    Image(systemName: "arrow.2.squarepath")
                }
                .padding(.horizontal, 8)

                TextField("Nouveau message", text: $messageText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                }
            }
            .padding()
        }
        .navigationTitle(peerName)
        .sheet(isPresented: $showSwapModal) {
            SwapProposalModal { proposal in
                // create a swap request and post a special message in the chat linking to it
                if let me = session.currentUser {
                    // create swap request in mock data
                    data.requestSwap(requesterId: me.id, targetId: conversationId, shiftId: proposal.shiftId ?? "unknown")
                    // create a message that indicates a swap proposal with a basic representation
                    let fmt = DateFormatter()
                    fmt.dateStyle = .medium
                    let content = "[SWAP_PROPOSAL]\nDate: \(fmt.string(from: proposal.date)) Start: \(proposal.start) End: \(proposal.end) Comment: \(proposal.comment)"
                    let msg = MessageItem(fromId: me.id, toId: conversationId, content: content, createdAt: Date(), attachmentName: nil)
                    data.sendMessage(msg)
                }
                showSwapModal = false
            }
        }
    }

    var messagesSorted: [MessageItem] {
        data.messages.filter { ($0.fromId == conversationId && $0.toId == session.currentUser?.id) || ($0.fromId == session.currentUser?.id && $0.toId == conversationId) }
            .sorted { $0.createdAt < $1.createdAt }
    }

    var peerName: String {
        session.users.first(where: { $0.id == conversationId })?.name ?? "—"
    }

    func sendMessage() {
        guard let me = session.currentUser, !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let msg = MessageItem(fromId: me.id, toId: conversationId, content: messageText, createdAt: Date(), attachmentName: nil)
        data.sendMessage(msg)
        messageText = ""
    }
}

struct MessageBubble: View {
    var message: MessageItem
    var isMe: Bool

    var body: some View {
        HStack {
            if isMe { Spacer() }
            VStack(alignment: .leading, spacing: 6) {
                if message.content.hasPrefix("[SWAP_PROPOSAL]") {
                    SwapProposalCardFromMessage(raw: message.content)
                } else {
                    Text(message.content).padding(10).background(isMe ? Color.blue : Color.gray.opacity(0.2)).foregroundColor(isMe ? Color.white : Color.primary).cornerRadius(16)
                }
                Text(message.createdAt, style: .time).font(.caption).foregroundColor(.secondary)
            }
            if !isMe { Spacer() }
        }
    }
}

struct SwapProposalCardFromMessage: View {
    var raw: String
    var body: some View {
        // naive parsing (for mock). The content format was encoded in ChatView.send swap
        let lines = raw.components(separatedBy: "\n")
        VStack(alignment: .leading, spacing: 8) {
            Text("Proposition d'échange").bold()
            ForEach(lines.dropFirst(), id: \.(self)) { l in
                Text(l).font(.subheadline)
            }
            HStack {
                Button("Accepter") {
                    // In a real app, update swap request state; here we append a confirming message
                }
                .buttonStyle(.bordered)
                Button("Refuser") {
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

struct NewConversationView: View {
    var onSelect: (String) -> Void
    @EnvironmentObject var session: SessionStore

    var body: some View {
        NavigationView {
            List(session.users.filter { $0.id != session.currentUser?.id }) { u in
                Button {
                    onSelect(u.id)
                } label: {
                    HStack {
                        ProfileCircle(name: u.name)
                        VStack(alignment: .leading) {
                            Text(u.name)
                            Text(u.unit).font(.caption).foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Nouvelle conversation")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { }
                }
            }
        }
    }
}
