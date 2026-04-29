enum AlertSeverity { info, warning, critical }

enum AlertScope { global, category }

/// A computed alert (not persisted — derived from [BudgetStatus]).
class BudgetAlert {
  const BudgetAlert({
    required this.scope,
    required this.severity,
    required this.title,
    required this.message,
    this.categoryId,
  });

  final AlertScope scope;
  final AlertSeverity severity;
  final String title;
  final String message;
  final String? categoryId;
}
