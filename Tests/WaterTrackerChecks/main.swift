import Darwin
import Foundation
import WaterTracker

let fixedToday = Date(timeIntervalSince1970: 1_780_704_000)
let fixedTomorrow = fixedToday.addingTimeInterval(86_400)

func expectEqual<T: Equatable>(_ actual: T, _ expected: T, _ message: String) {
    guard actual == expected else {
        print("FAIL: \(message) expected \(expected), got \(actual)")
        exit(1)
    }
}

func testHydrationStore_givenEmptySharedStorage_thenTodayStartsAtZero() {
    let suiteName = "HydrationStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let store = HydrationStore(defaults: defaults)

    let snapshot = store.snapshot(on: fixedToday)

    expectEqual(snapshot.intakeML, 0, "intake starts empty")
    expectEqual(snapshot.dailyGoalML, 2_000, "default daily goal")
    expectEqual(snapshot.remainingML, 2_000, "remaining water starts at the full goal")
    expectEqual(snapshot.progress, 0, "progress starts empty")
}

func testHydrationStore_whenAddingWater_thenTodayTotalAndProgressUpdate() {
    let suiteName = "HydrationStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let store = HydrationStore(defaults: defaults)

    _ = store.add(amountML: 250, at: fixedToday)
    let snapshot = store.add(amountML: 500, at: fixedToday)

    expectEqual(snapshot.intakeML, 750, "today total includes all drinks")
    expectEqual(snapshot.remainingML, 1_250, "remaining water accounts for drinks")
    expectEqual(snapshot.progress, 0.375, "progress is total divided by daily goal")
}

func testHydrationStore_givenANewDay_thenTotalResets() {
    let suiteName = "HydrationStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let store = HydrationStore(defaults: defaults)

    _ = store.add(amountML: 500, at: fixedToday)

    let nextDaySnapshot = store.snapshot(on: fixedTomorrow)

    expectEqual(nextDaySnapshot.intakeML, 0, "a new day starts with no water logged")
    expectEqual(nextDaySnapshot.remainingML, 2_000, "a new day starts with the full goal remaining")
    expectEqual(nextDaySnapshot.progress, 0, "a new day starts with empty progress")
}

func testHydrationStore_givenInvalidInput_thenAmountIsIgnored() {
    let suiteName = "HydrationStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let store = HydrationStore(defaults: defaults)

    _ = store.add(amountML: -100, at: fixedToday)
    let snapshot = store.add(amountML: 0, at: fixedToday)

    expectEqual(snapshot.intakeML, 0, "invalid water amounts are ignored")
    expectEqual(snapshot.remainingML, 2_000, "invalid water amounts do not change remaining water")
    expectEqual(snapshot.progress, 0, "invalid water amounts do not change progress")
}

func testHydrationStore_givenIntakeAboveGoal_thenProgressIsClamped() {
    let suiteName = "HydrationStoreTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    let store = HydrationStore(defaults: defaults)

    let snapshot = store.add(amountML: 2_500, at: fixedToday)

    expectEqual(snapshot.intakeML, 2_500, "over-goal intake is still recorded")
    expectEqual(snapshot.remainingML, 0, "remaining water never goes below zero")
    expectEqual(snapshot.progress, 1, "progress is clamped at complete")
}

testHydrationStore_givenEmptySharedStorage_thenTodayStartsAtZero()
testHydrationStore_whenAddingWater_thenTodayTotalAndProgressUpdate()
testHydrationStore_givenANewDay_thenTotalResets()
testHydrationStore_givenInvalidInput_thenAmountIsIgnored()
testHydrationStore_givenIntakeAboveGoal_thenProgressIsClamped()
print("PASS: 5 hydration checks")
