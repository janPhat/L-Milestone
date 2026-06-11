import SwiftUI
import WidgetKit
import WaterTracker

struct WaterEntry: TimelineEntry {
    let date: Date
    let snapshot: HydrationSnapshot
}

struct WaterProvider: TimelineProvider {
    func placeholder(in context: Context) -> WaterEntry {
        WaterEntry(date: Date(), snapshot: HydrationSnapshot(intakeML: 750, dailyGoalML: 2_000))
    }

    func getSnapshot(in context: Context, completion: @escaping (WaterEntry) -> Void) {
        completion(entry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WaterEntry>) -> Void) {
        let now = Date()
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1_800)
        completion(Timeline(entries: [entry(for: now)], policy: .after(nextRefresh)))
    }

    private func entry(for date: Date) -> WaterEntry {
        let store = HydrationStore(defaults: HydrationAppGroup.defaults)
        return WaterEntry(date: date, snapshot: store.snapshot(on: date))
    }
}

struct WaterIntakeWidgetView: View {
    let entry: WaterEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Water")
                .font(.headline)

            Gauge(value: entry.snapshot.progress) {
                Text("Progress")
            } currentValueLabel: {
                Text("\(Int(entry.snapshot.progress * 100))%")
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .tint(.cyan)

            Text("\(entry.snapshot.intakeML) ml")
                .font(.title3.bold())

            Text("\(entry.snapshot.remainingML) ml left")
                .font(.caption)
                .foregroundStyle(.secondary)

            if #available(iOSApplicationExtension 17.0, *) {
                HStack(spacing: 8) {
                    Button(intent: AddWaterIntent(amountML: 250)) {
                        Text("+250")
                    }

                    Button(intent: AddWaterIntent(amountML: 500)) {
                        Text("+500")
                    }
                }
                .font(.caption.bold())
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .widgetBackground()
    }
}

struct WaterIntakeWidget: Widget {
    let kind = "WaterIntakeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WaterProvider()) { entry in
            WaterIntakeWidgetView(entry: entry)
        }
        .configurationDisplayName("Water Tracker")
        .description("Track today's water intake from your iPhone.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct WaterIntakeWidgetBundle: WidgetBundle {
    var body: some Widget {
        WaterIntakeWidget()
    }
}

private extension View {
    @ViewBuilder
    func widgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(.fill.tertiary, for: .widget)
        } else {
            background(Color(.systemBackground))
        }
    }
}

#Preview(as: .systemSmall) {
    WaterIntakeWidget()
} timeline: {
    WaterEntry(date: Date(), snapshot: HydrationSnapshot(intakeML: 750, dailyGoalML: 2_000))
}
