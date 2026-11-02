import Supabase
import SwiftUI

/// The user's past fit checks, newest first.
struct HistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var scans: [Scan] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error {
                    ContentUnavailableView("Couldn't load history", systemImage: "wifi.slash", description: Text(error))
                } else if scans.isEmpty {
                    ContentUnavailableView("No fits yet", systemImage: "tshirt", description: Text("Snap your first outfit to get a FitScore."))
                } else {
                    List(scans) { scan in
                        NavigationLink(value: scan) { HistoryRow(scan: scan) }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Your fits")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .navigationDestination(for: Scan.self) { HistoryDetailView(scan: $0) }
        }
        .task { await load() }
    }

    private func load() async {
        defer { isLoading = false }
        do {
            let response = try await Backend.client
                .from("scans")
                .select()
                .eq("status", value: "scored")
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
            scans = try Backend.decoder.decode([Scan].self, from: response.data)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct HistoryRow: View {
    let scan: Scan

    var body: some View {
        HStack(spacing: 12) {
            Text("\(scan.overall ?? 0)")
                .font(.title2.weight(.black))
                .foregroundStyle(Color.forScore(scan.overall ?? 0))
                .frame(width: 52)
            VStack(alignment: .leading, spacing: 2) {
                Text(scan.headline ?? "Fit check").font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(scan.createdAt, style: .date).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if let best = scan.bestFor.first {
                Text(best.occasion.emoji).font(.title3)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Downloads the stored photo, then shows the normal result screen.
private struct HistoryDetailView: View {
    let scan: Scan
    @State private var image: UIImage?
    @State private var failed = false

    var body: some View {
        Group {
            if let image {
                ResultView(scan: scan, image: image)
            } else if failed {
                ContentUnavailableView("Photo unavailable", systemImage: "photo")
            } else {
                ProgressView()
            }
        }
        .task {
            guard let path = scan.imagePath else { failed = true; return }
            do {
                let data = try await Backend.client.storage.from("scans").download(path: path)
                image = UIImage(data: data)
                failed = image == nil
            } catch {
                failed = true
            }
        }
    }
}
