import Foundation

enum HydrationAppGroup {
    static let identifier = "group.com.example.watertracker"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }
}
