import '../entities/budget_alert.dart';
import '../entities/budget_status.dart';
import '../entities/expense_category.dart';

/// Turns a [BudgetStatus] + per-category breakdown into actionable alerts.
///
/// Thresholds:
///   - warning: 80 %
///   - critical: 100 %+
///   - predictive: spending pace is >= 30 % faster than the prorated budget
class AlertDetector {
  const AlertDetector({
    this.warningThreshold = 0.80,
    this.criticalThreshold = 1.0,
    this.paceThreshold = 1.30,
  });

  final double warningThreshold;
  final double criticalThreshold;
  final double paceThreshold;

  List<BudgetAlert> detect({
    required BudgetStatus status,
    required List<CategoryBudgetStatus> perCategory,
  }) {
    final alerts = <BudgetAlert>[];

    // Global rule
    if (status.ratio >= criticalThreshold) {
      alerts.add(
        BudgetAlert(
          scope: AlertScope.global,
          severity: AlertSeverity.critical,
          title: 'Monthly budget exceeded',
          message:
              'You have spent more than 100% of your global budget for this month.',
        ),
      );
    } else if (status.ratio >= warningThreshold) {
      final pct = (status.ratio * 100).round();
      alerts.add(
        BudgetAlert(
          scope: AlertScope.global,
          severity: AlertSeverity.warning,
          title: 'Getting close to your limit',
          message: 'You have used $pct% of your monthly budget.',
        ),
      );
    } else if (status.paceRatio >= paceThreshold && status.daysRemaining > 1) {
      final pct = ((status.paceRatio - 1) * 100).round();
      alerts.add(
        BudgetAlert(
          scope: AlertScope.global,
          severity: AlertSeverity.info,
          title: 'Unusual spending pace',
          message:
              'You are spending $pct% faster than your allocated pace. Projected end-of-month total will exceed your budget.',
        ),
      );
    }

    // Per-category rules
    for (final cat in perCategory) {
      if (cat.budget <= 0) continue;
      final category = CategoryCatalog.byId(cat.categoryId);
      if (cat.ratio >= criticalThreshold) {
        alerts.add(
          BudgetAlert(
            scope: AlertScope.category,
            severity: AlertSeverity.critical,
            title: '${category.name} over budget',
            message:
                'You exceeded your ${category.name} budget. Time to cool down on this category.',
            categoryId: cat.categoryId,
          ),
        );
      } else if (cat.ratio >= warningThreshold) {
        final pct = (cat.ratio * 100).round();
        alerts.add(
          BudgetAlert(
            scope: AlertScope.category,
            severity: AlertSeverity.warning,
            title: '${category.name} at $pct%',
            message: 'Approaching limit for ${category.name}.',
            categoryId: cat.categoryId,
          ),
        );
      }
    }

    // Highest severity first
    alerts.sort((a, b) => b.severity.index.compareTo(a.severity.index));
    return alerts;
  }
}
