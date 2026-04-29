import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_date_utils.dart';
import '../../core/utils/currency_formatter.dart';
import '../../data/repositories/budget_repository.dart';
import '../../data/repositories/expense_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../domain/entities/app_settings.dart';
import '../../domain/entities/budget_alert.dart';
import '../../domain/entities/budget_status.dart';
import '../../domain/entities/expense.dart';
import '../../domain/entities/monthly_budget.dart';
import '../../domain/services/alert_detector.dart';
import '../../domain/services/budget_calculator.dart';
import '../../domain/services/month_cycle_service.dart';

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

final expenseRepositoryProvider = Provider<ExpenseRepository>((ref) {
  return ExpenseRepository.fromHive();
});

final budgetRepositoryProvider = Provider<BudgetRepository>((ref) {
  return BudgetRepository.fromHive();
});

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository.fromHive();
});

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

final budgetCalculatorProvider = Provider<BudgetCalculator>((ref) {
  return const BudgetCalculator();
});

final alertDetectorProvider = Provider<AlertDetector>((ref) {
  return const AlertDetector();
});

final monthCycleServiceProvider = Provider<MonthCycleService>((ref) {
  return const MonthCycleService();
});

// ---------------------------------------------------------------------------
// Clock (overridable for tests & deterministic widget snapshots)
// ---------------------------------------------------------------------------

final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

class SettingsNotifier extends Notifier<AppSettings> {
  @override
  AppSettings build() {
    final repo = ref.watch(settingsRepositoryProvider);
    // Re-read from Hive whenever the settings key changes.
    final sub = repo.changes().listen((_) {
      state = repo.get();
    });
    ref.onDispose(sub.cancel);
    return repo.get();
  }

  Future<void> update(AppSettings Function(AppSettings) mutator) async {
    final next = mutator(state);
    await ref.read(settingsRepositoryProvider).save(next);
    state = next;
  }
}

final settingsProvider =
    NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

class ExpensesNotifier extends Notifier<List<Expense>> {
  @override
  List<Expense> build() {
    final repo = ref.watch(expenseRepositoryProvider);
    final sub = repo.changes().listen((_) => state = repo.all());
    ref.onDispose(sub.cancel);
    return repo.all();
  }

  Future<void> add(Expense expense) =>
      ref.read(expenseRepositoryProvider).add(expense);

  Future<void> remove(String id) =>
      ref.read(expenseRepositoryProvider).remove(id);

  Future<void> clear() => ref.read(expenseRepositoryProvider).clear();
}

final expensesProvider =
    NotifierProvider<ExpensesNotifier, List<Expense>>(ExpensesNotifier.new);

class CurrentBudgetNotifier extends Notifier<MonthlyBudget?> {
  @override
  MonthlyBudget? build() {
    final repo = ref.watch(budgetRepositoryProvider);
    final now = ref.watch(clockProvider)();
    final key = AppDateUtils.monthKey(now);
    final sub = repo.changes().listen((_) {
      state = repo.getForMonth(key);
    });
    ref.onDispose(sub.cancel);
    return repo.getForMonth(key);
  }

  Future<void> save(MonthlyBudget budget) async {
    await ref.read(budgetRepositoryProvider).upsert(budget);
    state = budget;
  }
}

final currentBudgetProvider =
    NotifierProvider<CurrentBudgetNotifier, MonthlyBudget?>(
  CurrentBudgetNotifier.new,
);

// ---------------------------------------------------------------------------
// Derived providers
// ---------------------------------------------------------------------------

final currencyFormatterProvider = Provider<CurrencyFormatter>((ref) {
  final settings = ref.watch(settingsProvider);
  return CurrencyFormatter(settings.currency, locale: settings.locale);
});

final budgetStatusProvider = Provider<BudgetStatus?>((ref) {
  final budget = ref.watch(currentBudgetProvider);
  if (budget == null) return null;
  final expenses = ref.watch(expensesProvider);
  final calc = ref.watch(budgetCalculatorProvider);
  final now = ref.watch(clockProvider)();
  return calc.compute(budget: budget, expenses: expenses, now: now);
});

final perCategoryStatusProvider = Provider<List<CategoryBudgetStatus>>((ref) {
  final budget = ref.watch(currentBudgetProvider);
  if (budget == null) return const [];
  final expenses = ref.watch(expensesProvider);
  final calc = ref.watch(budgetCalculatorProvider);
  return calc.perCategory(budget: budget, expenses: expenses);
});

final dailySpendProvider = Provider<List<double>>((ref) {
  final budget = ref.watch(currentBudgetProvider);
  if (budget == null) return const [];
  final expenses = ref.watch(expensesProvider);
  final calc = ref.watch(budgetCalculatorProvider);
  return calc.dailySpend(budget: budget, expenses: expenses);
});

final alertsProvider = Provider<List<BudgetAlert>>((ref) {
  final status = ref.watch(budgetStatusProvider);
  final perCategory = ref.watch(perCategoryStatusProvider);
  if (status == null) return const [];
  return ref.watch(alertDetectorProvider).detect(
        status: status,
        perCategory: perCategory,
      );
});

/// Status for the **previous** month — used for mom comparison cards.
final previousMonthStatusProvider = Provider<BudgetStatus?>((ref) {
  final now = ref.watch(clockProvider)();
  final prevKey = AppDateUtils.monthKey(AppDateUtils.previousMonth(now));
  final repo = ref.watch(budgetRepositoryProvider);
  final prev = repo.getForMonth(prevKey);
  if (prev == null) return null;
  final expenses = ref.watch(expensesProvider);
  final calc = ref.watch(budgetCalculatorProvider);
  return calc.compute(
    budget: prev,
    expenses: expenses,
    now: AppDateUtils.endOfMonth(prev.startedOn),
  );
});
