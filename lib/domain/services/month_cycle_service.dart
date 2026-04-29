import '../../core/utils/app_date_utils.dart';
import '../entities/monthly_budget.dart';

/// Handles month-over-month budget rollover.
///
/// On each app launch we compare [AppSettings.lastSeenMonthKey] with the
/// current month. When they differ, we:
///   1. Duplicate the previous month's category budgets into a new
///      [MonthlyBudget] so the user has a ready-to-tweak baseline.
///   2. Record [DateTime.now] as `startedOn` so the prorated-budget math
///      correctly reflects when the user first interacted with the new month.
///
/// The service is pure — it does *not* persist anything. Callers are
/// responsible for writing the returned budget and updating settings.
class MonthCycleService {
  const MonthCycleService();

  /// Returns a fresh [MonthlyBudget] for [now]'s month, carrying over the
  /// previous month's configuration when available.
  MonthlyBudget rollover({
    required DateTime now,
    required MonthlyBudget? previous,
  }) {
    final key = AppDateUtils.monthKey(now);
    if (previous == null) {
      return MonthlyBudget(
        monthKey: key,
        globalBudget: 0,
        categoryBudgets: const {},
        startedOn: now,
      );
    }
    return MonthlyBudget(
      monthKey: key,
      globalBudget: previous.globalBudget,
      categoryBudgets: Map<String, double>.from(previous.categoryBudgets),
      startedOn: now,
    );
  }

  /// Whether a new cycle is needed — i.e. the last seen month differs from
  /// the month containing [now].
  bool requiresRollover({
    required DateTime now,
    required String? lastSeenMonthKey,
  }) {
    if (lastSeenMonthKey == null) return false;
    return AppDateUtils.monthKey(now) != lastSeenMonthKey;
  }
}
