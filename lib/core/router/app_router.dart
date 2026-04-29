import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/providers/app_providers.dart';
import '../../presentation/screens/add_expense/add_expense_screen.dart';
import '../../presentation/screens/analytics/analytics_screen.dart';
import '../../presentation/screens/dashboard/dashboard_screen.dart';
import '../../presentation/screens/new_month/new_month_screen.dart';
import '../../presentation/screens/onboarding/onboarding_screen.dart';
import '../../presentation/screens/settings/settings_screen.dart';
import '../../presentation/screens/shell/home_shell.dart';
import '../utils/app_date_utils.dart';

abstract final class AppRoutes {
  static const onboarding = '/onboarding';
  static const dashboard = '/';
  static const analytics = '/analytics';
  static const settings = '/settings';
  static const addExpense = '/expense/new';
  static const newMonth = '/new-month';
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: AppRoutes.dashboard,
    refreshListenable: _Refresher(ref),
    redirect: (context, state) {
      final settings = ref.read(settingsProvider);
      final location = state.matchedLocation;

      if (!settings.onboardingComplete) {
        return location == AppRoutes.onboarding ? null : AppRoutes.onboarding;
      }

      final now = ref.read(clockProvider)();
      final currentKey = AppDateUtils.monthKey(now);

      // Ensure there's always a MonthlyBudget for the current month when
      // onboarding is complete. If none, push the new month setup screen.
      final currentBudget = ref.read(currentBudgetProvider);
      if (currentBudget == null && location != AppRoutes.newMonth) {
        return AppRoutes.newMonth;
      }

      // Bump lastSeenMonthKey when entering any authenticated route.
      if (settings.lastSeenMonthKey != currentKey &&
          location != AppRoutes.newMonth) {
        return AppRoutes.newMonth;
      }

      if (location == AppRoutes.onboarding) return AppRoutes.dashboard;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.newMonth,
        builder: (context, state) => const NewMonthScreen(),
      ),
      GoRoute(
        path: AppRoutes.addExpense,
        builder: (context, state) => const AddExpenseScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DashboardScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.analytics,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: AnalyticsScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.settings,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SettingsScreen(),
            ),
          ),
        ],
      ),
    ],
  );

  ref.onDispose(router.dispose);
  return router;
});

/// Bridges Riverpod's settings & budget state to GoRouter's refresh mechanism.
class _Refresher extends ChangeNotifier {
  _Refresher(this._ref) {
    _ref.listen(settingsProvider, (_, __) => notifyListeners());
    _ref.listen(currentBudgetProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
