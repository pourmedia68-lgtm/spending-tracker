import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../providers/app_providers.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/gradient_background.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final budget = ref.watch(currentBudgetProvider);
    final currency = ref.watch(currencyFormatterProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: GradientBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.xl),
            children: [
              Text('Settings', style: AppTypography.displayMedium),
              const SizedBox(height: AppSpacing.xl),
              GlassCard(
                child: Column(
                  children: [
                    _SettingsRow(
                      icon: PhosphorIconsDuotone.currencyCircleDollar,
                      label: 'Currency',
                      trailing: Text(
                        settings.currency,
                        style: AppTypography.title,
                      ),
                      onTap: () => _pickCurrency(context, ref),
                    ),
                    Divider(color: Colors.white.withValues(alpha: 0.06)),
                    _SettingsRow(
                      icon: PhosphorIconsDuotone.target,
                      label: 'Monthly budget',
                      trailing: Text(
                        budget == null
                            ? '—'
                            : currency.format(budget.globalBudget),
                        style: AppTypography.title,
                      ),
                      onTap: () => context.push(AppRoutes.newMonth),
                    ),
                    Divider(color: Colors.white.withValues(alpha: 0.06)),
                    _SettingsRow(
                      icon: PhosphorIconsDuotone.arrowClockwise,
                      label: 'Start new month now',
                      trailing: const Icon(
                        PhosphorIconsBold.caretRight,
                        color: AppColors.textMuted,
                      ),
                      onTap: () => context.push(AppRoutes.newMonth),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              GlassCard(
                gradient: const LinearGradient(
                  colors: [Color(0xFF3A1725), Color(0xFF1F1024)],
                ),
                child: Column(
                  children: [
                    _SettingsRow(
                      icon: PhosphorIconsDuotone.broom,
                      label: 'Clear all expenses',
                      trailing: const Icon(
                        PhosphorIconsBold.caretRight,
                        color: AppColors.danger,
                      ),
                      iconColor: AppColors.danger,
                      labelColor: AppColors.danger,
                      onTap: () => _confirmClear(context, ref),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Center(
                child: Text(
                  'v0.1.0 · Spending Tracker',
                  style: AppTypography.caption,
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickCurrency(BuildContext context, WidgetRef ref) async {
    const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'MAD'];
    final chosen = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.bgElevated,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppSpacing.md),
            for (final c in currencies)
              ListTile(
                title: Text(c, style: AppTypography.title),
                onTap: () => Navigator.of(ctx).pop(c),
              ),
            const SizedBox(height: AppSpacing.md),
          ],
        ),
      ),
    );
    if (chosen != null) {
      await ref
          .read(settingsProvider.notifier)
          .update((s) => s.copyWith(currency: chosen));
    }
  }

  Future<void> _confirmClear(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgElevated,
        title: Text('Clear all expenses?', style: AppTypography.title),
        content: Text(
          'This cannot be undone. Your budget setup will stay.',
          style: AppTypography.bodyMuted,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(expensesProvider.notifier).clear();
    }
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.trailing,
    required this.onTap,
    this.iconColor,
    this.labelColor,
  });

  final IconData icon;
  final String label;
  final Widget trailing;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? labelColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Row(
            children: [
              Icon(icon, color: iconColor ?? AppColors.textSecondary),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.body.copyWith(
                    color: labelColor ?? AppColors.textPrimary,
                  ),
                ),
              ),
              trailing,
            ],
          ),
        ),
      ),
    );
  }
}
