import Foundation

public struct HydrationSnapshot: Equatable {
    public let intakeML: Int
    public let dailyGoalML: Int

    public init(intakeML: Int, dailyGoalML: Int) {
        self.intakeML = intakeML
        self.dailyGoalML = dailyGoalML
    }

    public var remainingML: Int {
        max(0, dailyGoalML - intakeML)
    }

    public var progress: Double {
        guard dailyGoalML > 0 else {
            return 0
        }

        return min(1, Double(intakeML) / Double(dailyGoalML))
    }
}

public final class HydrationStore {
    private let defaults: UserDefaults
    private let dailyGoalML: Int
    private let calendar: Calendar
    private let storageKeyPrefix = "HydrationStore.intakeML."

    public init(defaults: UserDefaults, dailyGoalML: Int = 2_000, calendar: Calendar = .current) {
        self.defaults = defaults
        self.dailyGoalML = dailyGoalML
        self.calendar = calendar
    }

    public func snapshot(on date: Date = Date()) -> HydrationSnapshot {
        HydrationSnapshot(intakeML: defaults.integer(forKey: storageKey(for: date)), dailyGoalML: dailyGoalML)
    }

    @discardableResult
    public func add(amountML: Int, at date: Date = Date()) -> HydrationSnapshot {
        guard amountML > 0 else {
            return snapshot(on: date)
        }

        let key = storageKey(for: date)
        let updatedTotal = defaults.integer(forKey: key) + amountML
        defaults.set(updatedTotal, forKey: key)
        return snapshot(on: date)
    }

    private func storageKey(for date: Date) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        let year = components.year ?? 0
        let month = components.month ?? 0
        let day = components.day ?? 0

        return "\(storageKeyPrefix)\(year)-\(month)-\(day)"
    }
}
