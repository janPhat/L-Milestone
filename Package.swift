// swift-tools-version: 6.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "WaterTracker",
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .library(
            name: "WaterTracker",
            targets: ["WaterTracker"]
        ),
        .executable(
            name: "WaterTrackerChecks",
            targets: ["WaterTrackerChecks"]
        ),
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "WaterTracker"
        ),
        .executableTarget(
            name: "WaterTrackerChecks",
            dependencies: ["WaterTracker"],
            path: "Tests/WaterTrackerChecks"
        ),
    ],
    swiftLanguageModes: [.v6]
)
