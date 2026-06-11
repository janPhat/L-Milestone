# Water Tracker

Small Swift water-tracking package plus iOS app and WidgetKit source files.
It also includes a local web app for tracking daily water, exercise, weight, and waist goals.

## What is included

- `Sources/WaterTracker`: shared hydration logic backed by `UserDefaults`
- `Tests/WaterTrackerChecks`: local automated behavior checks
- `iOS/WaterTrackerApp`: SwiftUI app screen with quick-add buttons
- `iOS/WaterTrackerWidget`: iPhone widget with progress display and iOS 17 quick-add buttons
- `iOS/Shared`: shared App Group defaults helper
- `web`: browser-based L Health tracker backed by local storage

## Local verification

```sh
swift run WaterTrackerChecks
npm test
```

## Web app preview

```sh
npm run dev
```

Then keep `http://localhost:4173/` open. The local page auto-refreshes when web files change.

This environment does not currently have full Xcode selected, so WidgetKit cannot be built here with `xcodebuild`. To run the widget on iPhone, open/create an iOS app in Xcode, add the app files to the app target, add the widget files to a Widget Extension target, and add `iOS/Shared/HydrationAppGroup.swift` plus the `WaterTracker` package to both targets.

Before device testing, change `group.com.example.watertracker` in `iOS/Shared/HydrationAppGroup.swift` to your real App Group identifier and enable the same App Group capability on the app and widget extension.
