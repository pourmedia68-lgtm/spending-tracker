import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/utils/app_date_utils.dart';
import '../../../domain/entities/expense_category.dart';
import '../../../domain/entities/monthly_budget.dart';
import '../../providers/app_providers.dart';
import '../../widgets/category_avatar.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/gradient_background.dart';

/// Shown when the app detects a new month without a configured budget.
///
/// It proposes the previous month's values and lets the user confirm or edit
/// them before entering the dashboard.
class NewMonthScreen extends ConsumerStatefulWidget {
  const NewMonthScreen({super.key});

  @override
  ConsumerState<NewMonthScreen> createState() => _NewMonthScreenState();
}

class _NewMonthScreenState extends ConsumerState<NewMonthScreen> {
  late TextEditingController _globalCtrl;
  final Map<String, TextEditingController> _perCatCtrls = {};

  @override
  void initState() {
    super.initState();
    final now = ref.read(clockProvider)();
    final service = ref.read(monthCycleServiceProvider);
    final previous = ref.read(budgetRepositoryProvider).latest();
    final proposed = service.rollover(now: now, previous: previous);
    _globalCtrl = TextEditingController(
      text: proposed.globalBudget > 0 ? proposed.globalBudget.toStringAsFixed(0) : '',
    );
    for (final c in CategoryCatalog.all) {
      final value = proposed.categoryBudgets[c.id] ?? 0;
      _perCatCtrls[c.id] = TextEditingController(
        text: value > 0 ? value.toStringAsFixed(0) : '',
      );
    }
  }

  @override
  void dispose() {
    _globalCtrl.dispose();
    for (final c in _perCatCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final global = double.tryParse(_globalCtrl.text.replaceAll(',', '.')) ?? 0;
    if (global <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Set a global budget first.')),
      );
      return;
    }

    final catBudgets = <String, double>{};
    for (final entry in _perCatCtrls.entries) {
      final raw = entry.value.text.replaceAll(',', '.');
      final parsed = double.tryParse(raw) ?? 0;
      if (parsed > 0) catBudgets[entry.key] = parsed;
    }

    final now = ref.read(clockProvider)();
    final monthKey = AppDateUtils.monthKey(now);

    final budget = MonthlyBudget(
      monthKey: monthKey,
      globalBudget: global,
      categoryBudgets: catBudgets,
      startedOn: now,
    );
    await ref.read(currentBudgetProvider.notifier).save(budget);
    await ref.read(settingsProvider.notifier).update(
          (s) => s.copyWith(lastSeenMonthKey: monthKey),
        );

    if (!mounted) return;
    context.go(AppRoutes.dashboard);
  }

  @override
  Widget build(BuildContext context) {
    final now = ref.watch(clockProvider)();
    final daysLeft = AppDateUtils.daysRemainingInclusive(now);
    final daysInMonth = AppDateUtils.daysInMonth(now);
    final currency = ref.watch(currencyFormatterProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: GradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('New month.', style: AppTypography.displayMedium),
                    const SizedBox(height: 4),
                    Text(
                      '$daysLeft of $daysInMonth days left — adjust your budget or keep it as is.',
                      style: AppTypography.bodyMuted,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  children: [
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Global budget',
                            style: AppTypography.label,
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Row(
                            children: [
                              Text(
                                currency.symbol.trim(),
                                style: AppTypography.headline,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _globalCtrl,
                                  keyboardType:
                                      const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(
                                      RegExp(r'[0-9.,]'),
                                    ),
                                  ],
                                  style: AppTypography.displayMedium,
                                  decoration: const InputDecoration(
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    filled: false,
                                    hintText: '0',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Per-category budgets',
                      style: AppTypography.label,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    GlassCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      child: Column(
                        children: [
                          for (final cat in CategoryCatalog.all)
                            _CategoryBudgetRow(
                              category: cat,
                              controller: _perCatCtrls[cat.id]!,
                              currencySymbol: currency.symbol.trim(),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl,
                  0,
                  AppSpacing.xl,
                  AppSpacing.xl,
                ),
                child: SizedBox(
                  height: 56,
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _save,
                    child: const Text('Start the month'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryBudgetRow extends StatelessWidget {
  const _CategoryBudgetRow({
    required this.category,
    required this.controller,
    required this.currencySymbol,
  });

  final ExpenseCategory category;
  final TextEditingController controller;
  final String currencySymbol;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.sm,
        horizontal: AppSpacing.sm,
      ),
      child: Row(
        children: [
          CategoryAvatar(category: category, size: 38),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(category.name, style: AppTypography.body),
          ),
          SizedBox(
            width: 120,
            child: TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              textAlign: TextAlign.end,
              style: AppTypography.title,
              decoration: InputDecoration(
                isDense: true,
                prefixText: '$currencySymbol ',
                prefixStyle: AppTypography.caption,
                hintText: '0',
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.04),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
