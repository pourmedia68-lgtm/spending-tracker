import 'package:hive/hive.dart';

import '../../domain/entities/monthly_budget.dart';
import '../local/hive_boxes.dart';

class BudgetRepository {
  BudgetRepository(this._box);

  factory BudgetRepository.fromHive() =>
      BudgetRepository(Hive.box<MonthlyBudget>(HiveBoxNames.budgets));

  final Box<MonthlyBudget> _box;

  Stream<void> changes() => _box.watch().map((_) {});

  MonthlyBudget? getForMonth(String monthKey) => _box.get(monthKey);

  MonthlyBudget? latest() {
    if (_box.isEmpty) return null;
    final keys = _box.keys.cast<String>().toList()..sort();
    return _box.get(keys.last);
  }

  Future<void> upsert(MonthlyBudget budget) =>
      _box.put(budget.monthKey, budget);

  Future<void> clear() => _box.clear();
}
