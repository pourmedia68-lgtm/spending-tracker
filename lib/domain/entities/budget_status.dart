/// Aggregated budget state used by the dashboard & alert engine.
class BudgetStatus {
  const BudgetStatus({
    required this.budget,
    required this.spent,
    required this.proratedBudget,
    required this.daysRemaining,
    required this.daysElapsed,
  });

  /// User-defined budget for the month.
  final double budget;

  /// Total amount already spent.
  final double spent;

  /// Budget proportionally applied to the portion of the month *already used*.
  /// If the user started mid-month, [proratedBudget] only represents the budget
  /// allotted from [BudgetStatus.startedOn] onward.
  final double proratedBudget;

  final int daysRemaining;
  final int daysElapsed;

  double get remaining => (budget - spent);

  /// Spending ratio against the full monthly budget.
  double get ratio => budget <= 0 ? 0 : (spent / budget).clamp(0, 10).toDouble();

  /// Expected spending ratio based on days elapsed vs. prorated budget.
  /// Used for predictive alerts.
  double get paceRatio {
    if (proratedBudget <= 0) return 0;
    return (spent / proratedBudget).clamp(0, 10).toDouble();
  }

  /// Linear projection of end-of-month spend based on current daily pace.
  double get projectedSpend {
    if (daysElapsed <= 0) return spent;
    final perDay = spent / daysElapsed;
    return perDay * (daysElapsed + daysRemaining);
  }

  /// Average daily spend since start.
  double get dailyPace {
    if (daysElapsed <= 0) return 0;
    return spent / daysElapsed;
  }
}

class CategoryBudgetStatus {
  const CategoryBudgetStatus({
    required this.categoryId,
    required this.budget,
    required this.spent,
  });

  final String categoryId;
  final double budget;
  final double spent;

  double get remaining => budget - spent;

  double get ratio {
    if (budget <= 0) return spent > 0 ? 1 : 0;
    return (spent / budget).clamp(0, 10).toDouble();
  }
}
