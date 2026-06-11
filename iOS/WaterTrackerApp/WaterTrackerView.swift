import SwiftUI
import WidgetKit
import WaterTracker

struct WaterTrackerView: View {
    @State private var snapshot = WaterTrackerView.store.snapshot()

    private static let store = HydrationStore(defaults: HydrationAppGroup.defaults)
    private let quickAmounts = [150, 250, 500]

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                VStack(spacing: 12) {
                    ProgressView(value: snapshot.progress)
                        .progressViewStyle(.linear)
                        .tint(.cyan)

                    Text("\(snapshot.intakeML) ml")
                        .font(.system(size: 48, weight: .bold, design: .rounded))

                    Text("\(snapshot.remainingML) ml left today")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    ForEach(quickAmounts, id: \.self) { amount in
                        Button {
                            addWater(amount)
                        } label: {
                            Text("+\(amount) ml")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            }
            .padding(24)
            .navigationTitle("Water")
            .onAppear(perform: refresh)
        }
    }

    private func addWater(_ amountML: Int) {
        snapshot = Self.store.add(amountML: amountML)
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func refresh() {
        snapshot = Self.store.snapshot()
    }
}

#Preview {
    WaterTrackerView()
}
