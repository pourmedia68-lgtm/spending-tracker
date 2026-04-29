import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../domain/entities/expense_category.dart';
import '../../providers/app_providers.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/section_title.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(budgetStatusProvider);
    final previous = ref.watch(previousMonthStatusProvider);
    final perCat = ref.watch(perCategoryStatusProvider);
    final currency = ref.watch(currencyFormatterProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: GradientBackground(
        child: SafeArea(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl,
                  AppSpacing.lg,
                  AppSpacing.xl,
                  AppSpacing.md,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Insights', style: AppTypography.displayMedium),
                    const SizedBox(height: 4),
                    Text(
                      'Understand where your money goes.',
                      style: AppTypography.bodyMuted,
                    ),
                  ],
                ),
              ),
              if (status != null)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  child: _ForecastCard(status: status, currency: currency),
                ),
              if (previous != null)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                    vertical: AppSpacing.lg,
                  ),
                  child: _ComparisonCard(
                    current: status?.spent ?? 0,
                    previous: previous.spent,
                    currency: currency.symbol,
                    formatted: (v) => currency.format(v),
                  ),
                ),
              if (perCat.isNotEmpty) ...[
                const SectionTitle(title: 'Category share'),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  child: _CategoryShareCard(perCat: perCat),
                ),
              ],
              const SizedBox(height: 120),
            ],
          ),
        ),
      ),
    );
  }
}

class _ForecastCard extends StatelessWidget {
  const _ForecastCard({required this.status, required this.currency});

  final dynamic status; // BudgetStatus
  final dynamic currency;

  @override
  Widget build(BuildContext context) {
    final projected = status.projectedSpend as double;
    final budget = status.budget as double;
    final diff = projected - budget;
    final exceeds = diff > 0;

    return GlassCard(
      glowColor: exceeds ? AppColors.danger : AppColors.success,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                exceeds
                    ? PhosphorIconsFill.warning
                    : PhosphorIconsFill.sparkle,
                color: exceeds ? AppColors.danger : AppColors.success,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text('End-of-month forecast', style: AppTypography.title),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            currency.format(projected),
            style: AppTypography.displayMedium.copyWith(
              color: exceeds ? AppColors.danger : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            exceeds
                ? 'At your current pace, you will overshoot by ${currency.format(diff)}.'
                : 'You are on track. Estimated leftover: ${currency.format(-diff)}.',
            style: AppTypography.bodyMuted,
          ),
        ],
      ),
    );
  }
}

class _ComparisonCard extends StatelessWidget {
  const _ComparisonCard({
    required this.current,
    required this.previous,
    required this.currency,
    required this.formatted,
  });

  final double current;
  final double previous;
  final String currency;
  final String Function(double) formatted;

  @override
  Widget build(BuildContext context) {
    final diff = current - previous;
    final pct = previous > 0 ? (diff / previous) * 100 : 0;
    final up = diff > 0;

    return GlassCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('vs last month', style: AppTypography.label),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '${up ? '+' : ''}${pct.toStringAsFixed(1)}%',
                  style: AppTypography.displayMedium.copyWith(
                    color: up ? AppColors.danger : AppColors.success,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Previous: ${formatted(previous)}',
                  style: AppTypography.bodyMuted,
                ),
              ],
            ),
          ),
          Icon(
            up ? PhosphorIconsFill.trendUp : PhosphorIconsFill.trendDown,
            color: up ? AppColors.danger : AppColors.success,
            size: 48,
          ),
        ],
      ),
    );
  }
}

class _CategoryShareCard extends StatelessWidget {
  const _CategoryShareCard({required this.perCat});

  final List perCat;

  @override
  Widget build(BuildContext context) {
    final total = perCat.fold<double>(0, (sum, s) => sum + (s.spent as double));
    if (total <= 0) {
      return GlassCard(
        child: Text(
          'No spending recorded yet this month.',
          style: AppTypography.bodyMuted,
        ),
      );
    }

    return GlassCard(
      child: Column(
        children: [
          SizedBox(
            height: 200,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 50,
                sections: [
                  for (final s in perCat.where((e) => (e.spent as double) > 0))
                    PieChartSectionData(
                      value: s.spent as double,
                      color: CategoryCatalog.byId(s.categoryId as String).color,
                      radius: 44,
                      showTitle: false,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.sm,
            children: [
              for (final s in perCat.where((e) => (e.spent as double) > 0))
                _Legend(
                  categoryId: s.categoryId as String,
                  share: (s.spent as double) / total,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.categoryId, required this.share});

  final String categoryId;
  final double share;

  @override
  Widget build(BuildContext context) {
    final c = CategoryCatalog.byId(categoryId);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: c.color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          '${c.name} ${(share * 100).round()}%',
          style: AppTypography.caption,
        ),
      ],
    );
  }
}
