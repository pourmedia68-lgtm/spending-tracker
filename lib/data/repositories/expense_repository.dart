import 'package:hive/hive.dart';

import '../../domain/entities/expense.dart';
import '../local/hive_boxes.dart';

class ExpenseRepository {
  ExpenseRepository(this._box);

  factory ExpenseRepository.fromHive() =>
      ExpenseRepository(Hive.box<Expense>(HiveBoxNames.expenses));

  final Box<Expense> _box;

  Stream<void> changes() => _box.watch().map((_) {});

  List<Expense> all() {
    final list = _box.values.toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  Future<void> add(Expense expense) => _box.put(expense.id, expense);

  Future<void> remove(String id) => _box.delete(id);

  Future<void> clear() => _box.clear();
}
