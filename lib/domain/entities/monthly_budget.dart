/// Budget configuration for a given month (keyed by `YYYY-MM`).
class MonthlyBudget {
  const MonthlyBudget({
    required this.monthKey,
    required this.globalBudget,
    required this.categoryBudgets,
    required this.startedOn,
  });

  /// The `YYYY-MM` key for the month this budget applies to.
  final String monthKey;

  /// Total budget defined by the user for the month.
  final double globalBudget;

  /// Per-category budget map (categoryId -> amount).
  final Map<String, double> categoryBudgets;

  /// The day the user actually started using the app within this month.
  /// Used to prorate remaining budget when onboarding mid-month.
  final DateTime startedOn;

  MonthlyBudget copyWith({
    String? monthKey,
    double? globalBudget,
    Map<String, double>? categoryBudgets,
    DateTime? startedOn,
  }) {
    return MonthlyBudget(
      monthKey: monthKey ?? this.monthKey,
      globalBudget: globalBudget ?? this.globalBudget,
      categoryBudgets: categoryBudgets ?? this.categoryBudgets,
      startedOn: startedOn ?? this.startedOn,
    );
  }
}
