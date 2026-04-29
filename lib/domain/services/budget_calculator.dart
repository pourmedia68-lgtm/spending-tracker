import '../../core/utils/app_date_utils.dart';
import '../entities/budget_status.dart';
import '../entities/expense.dart';
import '../entities/monthly_budget.dart';

/// Pure budget math. No IO, no Flutter.
class BudgetCalculator {
  const BudgetCalculator();

  /// Computes the aggregated budget status for the given month.
  ///
  /// [now] is injected so the function is deterministic and testable.
  BudgetStatus compute({
    required MonthlyBudget budget,
    required Iterable<Expense> expenses,
    required DateTime now,
  }) {
    final monthKey = budget.monthKey;
    final filtered = expenses.where(
      (e) => AppDateUtils.monthKey(e.date) == monthKey,
    );

    final spent = filtered.fold<double>(0, (sum, e) => sum + e.amount);

    final daysInMonth = AppDateUtils.daysInMonth(budget.startedOn);
    final startDay = budget.startedOn.day;

    // Days elapsed since the user started using the app this month — floor at 1
    // so the "proratedBudget" always has a meaningful denominator even on day 1.
    final elapsedRaw = now.day - startDay + 1;
    final elapsed = elapsedRaw.clamp(1, daysInMonth);

    final remainingRaw = daysInMonth - now.day;
    final remaining = remainingRaw.clamp(0, daysInMonth);

    final activeDays = daysInMonth - startDay + 1;
    final perDayAllowance = activeDays <= 0 ? 0.0 : budget.globalBudget / activeDays;
    final proratedBudget = perDayAllowance * elapsed;

    return BudgetStatus(
      budget: budget.globalBudget,
      spent: spent,
      proratedBudget: proratedBudget,
      daysRemaining: remaining,
      daysElapsed: elapsed,
    );
  }

  /// Per-category status for the month.
  List<CategoryBudgetStatus> perCategory({
    required MonthlyBudget budget,
    required Iterable<Expense> expenses,
  }) {
    final spentByCategory = <String, double>{};
    for (final e in expenses) {
      if (AppDateUtils.monthKey(e.date) != budget.monthKey) continue;
      spentByCategory.update(
        e.categoryId,
        (prev) => prev + e.amount,
        ifAbsent: () => e.amount,
      );
    }

    final ids = <String>{
      ...budget.categoryBudgets.keys,
      ...spentByCategory.keys,
    };

    final results = ids
        .map(
          (id) => CategoryBudgetStatus(
            categoryId: id,
            budget: budget.categoryBudgets[id] ?? 0,
            spent: spentByCategory[id] ?? 0,
          ),
        )
        .toList();

    // Sort by highest ratio descending — so the user sees what's hottest first.
    results.sort((a, b) => b.ratio.compareTo(a.ratio));
    return results;
  }

  /// Total spending per day within the given month (zero-filled).
  List<double> dailySpend({
    required MonthlyBudget budget,
    required Iterable<Expense> expenses,
  }) {
    final daysInMonth = AppDateUtils.daysInMonth(budget.startedOn);
    final series = List<double>.filled(daysInMonth, 0);
    for (final e in expenses) {
      if (AppDateUtils.monthKey(e.date) != budget.monthKey) continue;
      final idx = e.date.day - 1;
      if (idx < 0 || idx >= series.length) continue;
      series[idx] += e.amount;
    }
    return series;
  }
}
