import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/currency_formatter.dart';
import '../../domain/entities/budget_status.dart';
import '../../domain/entities/expense_category.dart';
import 'category_avatar.dart';

class CategoryProgressTile extends StatelessWidget {
  const CategoryProgressTile({
    super.key,
    required this.status,
    required this.currency,
    this.onTap,
  });

  final CategoryBudgetStatus status;
  final CurrencyFormatter currency;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final category = CategoryCatalog.byId(status.categoryId);
    final ratio = status.ratio;
    final over = ratio > 1.0;
    final barColor = over
        ? AppColors.danger
        : (ratio >= 0.8 ? AppColors.warning : category.color);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              CategoryAvatar(category: category, size: 44),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            category.name,
                            style: AppTypography.title,
                          ),
                        ),
                        Text(
                          currency.format(status.spent),
                          style: AppTypography.title,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            status.budget > 0
                                ? 'of ${currency.format(status.budget)}'
                                : 'No budget set',
                            style: AppTypography.bodyMuted,
                          ),
                        ),
                        Text(
                          '${(ratio * 100).clamp(0, 999).round()}%',
                          style: AppTypography.caption.copyWith(
                            color: over ? AppColors.danger : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      child: LinearProgressIndicator(
                        value: status.budget > 0 ? ratio.clamp(0.0, 1.0) : 0,
                        minHeight: 6,
                        backgroundColor: Colors.white.withValues(alpha: 0.06),
                        valueColor: AlwaysStoppedAnimation(barColor),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
