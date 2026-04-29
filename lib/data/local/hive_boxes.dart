import 'package:hive_flutter/hive_flutter.dart';

import '../../domain/entities/app_settings.dart';
import '../../domain/entities/expense.dart';
import '../../domain/entities/monthly_budget.dart';
import 'hive_adapters.dart';

abstract final class HiveBoxNames {
  static const expenses = 'expenses';
  static const budgets = 'budgets';
  static const settings = 'settings';
}

abstract final class HiveBootstrap {
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    await Hive.initFlutter('spending_tracker');

    if (!Hive.isAdapterRegistered(10)) {
      Hive.registerAdapter(ExpenseAdapter());
    }
    if (!Hive.isAdapterRegistered(11)) {
      Hive.registerAdapter(MonthlyBudgetAdapter());
    }
    if (!Hive.isAdapterRegistered(12)) {
      Hive.registerAdapter(AppSettingsAdapter());
    }

    await Hive.openBox<Expense>(HiveBoxNames.expenses);
    await Hive.openBox<MonthlyBudget>(HiveBoxNames.budgets);
    await Hive.openBox<AppSettings>(HiveBoxNames.settings);
  }
}
