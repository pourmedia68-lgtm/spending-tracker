import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

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

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _page = 0;

  String _currency = 'EUR';
  final _globalBudgetCtrl = TextEditingController();
  final _categoryBudgets = <String, double>{
    for (final c in CategoryCatalog.all) c.id: 0,
  };
  final Set<String> _selectedCategories = {
    for (final c in CategoryCatalog.all) c.id,
  };

  static const _currencies = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'MAD'];

  @override
  void dispose() {
    _pageController.dispose();
    _globalBudgetCtrl.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    } else {
      _complete();
    }
  }

  void _back() {
    if (_page == 0) return;
    _pageController.previousPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _complete() async {
    final globalBudget =
        double.tryParse(_globalBudgetCtrl.text.replaceAll(',', '.')) ?? 0;
    if (globalBudget <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please set a monthly budget first.')),
      );
      await _pageController.animateToPage(
        1,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
      return;
    }

    final now = ref.read(clockProvider)();
    final monthKey = AppDateUtils.monthKey(now);

    final selectedBudgets = <String, double>{
      for (final id in _selectedCategories)
        id: (_categoryBudgets[id] ?? 0).clamp(0, double.infinity).toDouble(),
    };

    final budget = MonthlyBudget(
      monthKey: monthKey,
      globalBudget: globalBudget,
      categoryBudgets: selectedBudgets,
      startedOn: now,
    );

    await ref.read(currentBudgetProvider.notifier).save(budget);
    await ref.read(settingsProvider.notifier).update(
          (s) => s.copyWith(
            currency: _currency,
            onboardingComplete: true,
            lastSeenMonthKey: monthKey,
          ),
        );

    if (!mounted) return;
    context.go(AppRoutes.dashboard);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: GradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              _Header(page: _page, onBack: _back),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (i) => setState(() => _page = i),
                  children: [
                    _CurrencyStep(
                      currencies: _currencies,
                      selected: _currency,
                      onChanged: (c) => setState(() => _currency = c),
                    ),
                    _BudgetStep(
                      controller: _globalBudgetCtrl,
                      currency: _currency,
                    ),
                    _CategoriesStep(
                      selected: _selectedCategories,
                      onToggle: (id) {
                        setState(() {
                          if (_selectedCategories.contains(id)) {
                            _selectedCategories.remove(id);
                          } else {
                            _selectedCategories.add(id);
                          }
                        });
                      },
                      budgets: _categoryBudgets,
                      currency: _currency,
                    ),
                  ],
                ),
              ),
              _Footer(page: _page, onNext: _next),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.page, required this.onBack});
  final int page;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        0,
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: page == 0 ? null : onBack,
            icon: const Icon(PhosphorIconsBold.arrowLeft),
            color: AppColors.textPrimary,
          ),
          const Spacer(),
          _StepIndicator(total: 3, current: page),
          const Spacer(),
          const SizedBox(width: 48),
        ],
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.total, required this.current});
  final int total;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(total, (i) {
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          height: 6,
          width: active ? 24 : 8,
          decoration: BoxDecoration(
            color: active ? AppColors.primaryGlow : Colors.white24,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.page, required this.onNext});
  final int page;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.md,
        AppSpacing.xl,
        AppSpacing.xl,
      ),
      child: SizedBox(
        height: 56,
        width: double.infinity,
        child: FilledButton(
          onPressed: onNext,
          child: Text(page < 2 ? 'Continue' : 'Finish setup'),
        ),
      ),
    );
  }
}

class _CurrencyStep extends StatelessWidget {
  const _CurrencyStep({
    required this.currencies,
    required this.selected,
    required this.onChanged,
  });

  final List<String> currencies;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      children: [
        const SizedBox(height: 16),
        Text('Welcome on board.', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'Pick the currency you use for daily expenses.',
          style: AppTypography.bodyMuted,
        ),
        const SizedBox(height: AppSpacing.xxxl),
        GlassCard(
          child: Column(
            children: [
              for (final c in currencies) ...[
                _CurrencyRow(
                  code: c,
                  selected: c == selected,
                  onTap: () => onChanged(c),
                ),
                if (c != currencies.last)
                  Divider(color: Colors.white.withValues(alpha: 0.06)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _CurrencyRow extends StatelessWidget {
  const _CurrencyRow({
    required this.code,
    required this.selected,
    required this.onTap,
  });

  final String code;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.md,
            horizontal: AppSpacing.sm,
          ),
          child: Row(
            children: [
              Text(code, style: AppTypography.title),
              const Spacer(),
              if (selected)
                const Icon(
                  PhosphorIconsFill.checkCircle,
                  color: AppColors.primaryGlow,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BudgetStep extends StatelessWidget {
  const _BudgetStep({required this.controller, required this.currency});

  final TextEditingController controller;
  final String currency;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      children: [
        const SizedBox(height: 16),
        Text('Set your monthly budget.', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'We’ll prorate it to the days remaining this month, then reset automatically at the start of each new cycle.',
          style: AppTypography.bodyMuted,
        ),
        const SizedBox(height: AppSpacing.xxxl),
        GlassCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(currency, style: AppTypography.headline),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: TextField(
                  controller: controller,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  textAlign: TextAlign.right,
                  style: AppTypography.displayMedium,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    hintText: '0',
                    filled: false,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoriesStep extends StatelessWidget {
  const _CategoriesStep({
    required this.selected,
    required this.onToggle,
    required this.budgets,
    required this.currency,
  });

  final Set<String> selected;
  final ValueChanged<String> onToggle;
  final Map<String, double> budgets;
  final String currency;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      children: [
        const SizedBox(height: 16),
        Text('Choose your categories.', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'Tap to toggle. You can set a dedicated budget per category later in Settings.',
          style: AppTypography.bodyMuted,
        ),
        const SizedBox(height: AppSpacing.xl),
        GridView.count(
          crossAxisCount: 3,
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (final c in CategoryCatalog.all)
              _CategoryPickTile(
                category: c,
                selected: selected.contains(c.id),
                onTap: () => onToggle(c.id),
              ),
          ],
        ),
      ],
    );
  }
}

class _CategoryPickTile extends StatelessWidget {
  const _CategoryPickTile({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final ExpenseCategory category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: selected ? 0.9 : 0.55),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: selected
                  ? category.color.withValues(alpha: 0.8)
                  : Colors.white.withValues(alpha: 0.04),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CategoryAvatar(category: category, size: 44, active: selected),
              const SizedBox(height: AppSpacing.sm),
              Text(
                category.name,
                style: AppTypography.caption.copyWith(
                  color: selected
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
