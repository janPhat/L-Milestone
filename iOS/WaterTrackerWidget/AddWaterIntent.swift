import AppIntents
import WidgetKit
import WaterTracker

@available(iOS 17.0, *)
struct AddWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Water"
    static var description = IntentDescription("Adds water to today's total.")

    @Parameter(title: "Amount in milliliters")
    var amountML: Int

    init() {
        amountML = 250
    }

    init(amountML: Int) {
        self.amountML = amountML
    }

    func perform() async throws -> some IntentResult {
        let store = HydrationStore(defaults: HydrationAppGroup.defaults)
        store.add(amountML: amountML)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
