# Spending Tracker — Premium Fintech

A Flutter MVP for tracking personal spending with a futuristic, fintech-grade UX.
Built with Clean Architecture, Riverpod, Hive, and GoRouter.

## Highlights

- **Smart monthly cycle** — auto-detects the first day of use and prorates the remaining
  budget for the current month.
- **Auto-reset each month** — carries over categories and prompts to confirm/update budgets
  at the start of each cycle.
- **Global + per-category budgets** — real-time tracking with animated progress rings.
- **Intelligent alerts** — warning at 80 %, critical at 100 %, plus predictive insights
  when spending velocity is abnormally high.
- **Premium design system** — dark theme by default, glassmorphism cards, gradient accents,
  Phosphor icon set.
- **9 categories** covering Lifestyle, Transport, Home, Work, Health, Education, Travel,
  Finance, Entertainment.

## Tech stack

| Layer | Choice |
|-------|--------|
| State | `flutter_riverpod` + code generation |
| Storage | `hive` / `hive_flutter` |
| Navigation | `go_router` |
| Charts | `fl_chart` |
| Icons | `phosphor_flutter` |
| Models | `freezed` + `json_serializable` |

## Architecture

```
lib/
├── main.dart                 # Bootstrap (Hive init, providers, runApp)
├── app.dart                  # MaterialApp.router + theme
├── core/                     # Design system, router, utilities
├── domain/                   # Pure entities + services (cycle, budget, alerts)
├── data/                     # Hive models + repositories
└── presentation/             # Screens, widgets, Riverpod providers
```

## Getting started

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run -d android
```

Build a debug APK:

```bash
flutter build apk --debug
```

## Status

MVP — scope covers onboarding, dashboard, expense entry, analytics, settings, and the
full monthly cycle engine. 3D category icons and push notifications are explicitly out
of scope for this iteration.
