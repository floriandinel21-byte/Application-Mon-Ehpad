import Foundation

// Extension helpers for MockDataService to better handle swapRequests from messaging UI
extension MockDataService {
    func createSwapProposal(requesterId: String, targetId: String, date: Date, start: String, end: String, comment: String) {
        let swap = SwapRequest(id: UUID().uuidString, requesterId: requesterId, targetId: targetId, shiftId: "s-\(Int(Date().timeIntervalSince1970))", requestedDate: date, state: .requested)
        swapRequests.append(swap)
        // also create a message representing the swap proposal
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        let content = "[SWAP_PROPOSAL]\nDate: \(fmt.string(from: date)) Start: \(start) End: \(end) Comment: \(comment)"
        let msg = MessageItem(fromId: requesterId, toId: targetId, content: content, createdAt: Date(), attachmentName: nil)
        messages.append(msg)
    }
}
