import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../providers/app_providers.dart';
import '../../widgets/alert_banner.dart';
import '../../widgets/animated_progress_ring.dart';
import '../../widgets/category_progress_tile.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/gradient_background.dart';
import '../../widgets/section_title.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(budgetStatusProvider);
    final currency = ref.watch(currencyFormatterProvider);
    final alerts = ref.watch(alertsProvider);
    final perCat = ref.watch(perCategoryStatusProvider);
    final daily = ref.watch(dailySpendProvider);
    final now = ref.watch(clockProvider)();

    if (status == null) {
      return const Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(
          child: Text('No budget configured.'),
        ),
      );
    }

    final ratio = status.budget > 0 ? status.spent / status.budget : 0.0;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: GradientBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xl,
                    AppSpacing.lg,
                    AppSpacing.xl,
                    AppSpacing.md,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('MMMM yyyy').format(now),
                        style: AppTypography.label,
                      ),
                      const SizedBox(height: 4),
                      Text('Your money', style: AppTypography.displayMedium),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  child: GlassCard(
                    glowColor:
                        ratio >= 1.0 ? AppColors.danger : AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xl,
                      vertical: AppSpacing.xxl,
                    ),
                    child: Column(
                      children: [
                        AnimatedProgressRing(
                          progress: ratio,
                          label: 'Remaining',
                          value: currency.format(
                            (status.budget - status.spent).clamp(
                              -1e12,
                              1e12,
                            ),
                          ),
                          sublabel:
                              '${status.daysRemaining}d left · pace ${(status.paceRatio * 100).clamp(0, 999).round()}%',
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _StatPill(
                              label: 'Spent',
                              value: currency.compact(status.spent),
                              color: AppColors.primaryGlow,
                              icon: PhosphorIconsFill.arrowUpRight,
                            ),
                            _StatPill(
                              label: 'Budget',
                              value: currency.compact(status.budget),
                              color: AppColors.accent,
                              icon: PhosphorIconsFill.target,
                            ),
                            _StatPill(
                              label: 'Projected',
                              value: currency.compact(status.projectedSpend),
                              color: status.projectedSpend > status.budget
                                  ? AppColors.danger
                                  : AppColors.success,
                              icon: PhosphorIconsFill.chartLineUp,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (alerts.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.xl,
                      AppSpacing.lg,
                      AppSpacing.xl,
                      0,
                    ),
                    child: Column(
                      children: [
                        for (final a in alerts.take(2)) ...[
                          AlertBanner(alert: a),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                      ],
                    ),
                  ),
                ),
              if (daily.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.xl,
                      AppSpacing.lg,
                      AppSpacing.xl,
                      0,
                    ),
                    child: _SpendTrendCard(daily: daily, today: now.day),
                  ),
                ),
              SliverToBoxAdapter(
                child: SectionTitle(
                  title: 'Categories',
                  trailing: Text(
                    '${perCat.length} active',
                    style: AppTypography.caption,
                  ),
                ),
              ),
              SliverList.separated(
                itemCount: perCat.length,
                separatorBuilder: (_, __) => Divider(
                  height: 1,
                  color: Colors.white.withValues(alpha: 0.04),
                  indent: AppSpacing.xl,
                  endIndent: AppSpacing.xl,
                ),
                itemBuilder: (context, i) => Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  child:
                      CategoryProgressTile(status: perCat[i], currency: currency),
                ),
              ),
              const SliverToBoxAdapter(
                child: SizedBox(height: 120),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(height: 6),
        Text(value, style: AppTypography.title),
        Text(label, style: AppTypography.caption),
      ],
    );
  }
}

class _SpendTrendCard extends StatelessWidget {
  const _SpendTrendCard({required this.daily, required this.today});

  final List<double> daily;
  final int today;

  @override
  Widget build(BuildContext context) {
    // Build cumulative series up to [today] for a clean trend line.
    final cumulative = <double>[];
    double running = 0;
    for (var i = 0; i < daily.length; i++) {
      if (i >= today) break;
      running += daily[i];
      cumulative.add(running);
    }
    if (cumulative.isEmpty) {
      cumulative.add(0);
    }

    final spots = [
      for (var i = 0; i < cumulative.length; i++)
        FlSpot(i.toDouble(), cumulative[i]),
    ];

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('Spend trend', style: AppTypography.title)),
              Text(
                'Day $today of ${daily.length}',
                style: AppTypography.caption,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 140,
            child: LineChart(
              LineChartData(
                lineTouchData: const LineTouchData(enabled: false),
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (daily.length - 1).toDouble(),
                minY: 0,
                maxY: (cumulative.last * 1.15).clamp(1, double.infinity),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    curveSmoothness: 0.3,
                    barWidth: 3,
                    color: AppColors.primaryGlow,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.primaryGlow.withValues(alpha: 0.45),
                          AppColors.primaryGlow.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
