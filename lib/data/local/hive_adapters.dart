import 'package:hive/hive.dart';

import '../../domain/entities/app_settings.dart';
import '../../domain/entities/expense.dart';
import '../../domain/entities/monthly_budget.dart';

/// Manual Hive TypeAdapters.
///
/// We intentionally avoid `hive_generator` to keep the dependency tree light
/// and immune to analyzer/macros version conflicts.

class ExpenseAdapter extends TypeAdapter<Expense> {
  @override
  final int typeId = 10;

  @override
  Expense read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0, n = reader.readByte(); i < n; i++)
        reader.readByte(): reader.read(),
    };
    return Expense(
      id: fields[0] as String,
      categoryId: fields[1] as String,
      amount: (fields[2] as num).toDouble(),
      date: DateTime.fromMillisecondsSinceEpoch(fields[3] as int),
      note: fields[4] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, Expense obj) {
    writer
      ..writeByte(5)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.categoryId)
      ..writeByte(2)
      ..write(obj.amount)
      ..writeByte(3)
      ..write(obj.date.millisecondsSinceEpoch)
      ..writeByte(4)
      ..write(obj.note);
  }
}

class MonthlyBudgetAdapter extends TypeAdapter<MonthlyBudget> {
  @override
  final int typeId = 11;

  @override
  MonthlyBudget read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0, n = reader.readByte(); i < n; i++)
        reader.readByte(): reader.read(),
    };
    final rawCategoryBudgets = fields[2] as Map;
    return MonthlyBudget(
      monthKey: fields[0] as String,
      globalBudget: (fields[1] as num).toDouble(),
      categoryBudgets: rawCategoryBudgets.map(
        (k, v) => MapEntry(k as String, (v as num).toDouble()),
      ),
      startedOn: DateTime.fromMillisecondsSinceEpoch(fields[3] as int),
    );
  }

  @override
  void write(BinaryWriter writer, MonthlyBudget obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.monthKey)
      ..writeByte(1)
      ..write(obj.globalBudget)
      ..writeByte(2)
      ..write(obj.categoryBudgets)
      ..writeByte(3)
      ..write(obj.startedOn.millisecondsSinceEpoch);
  }
}

class AppSettingsAdapter extends TypeAdapter<AppSettings> {
  @override
  final int typeId = 12;

  @override
  AppSettings read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0, n = reader.readByte(); i < n; i++)
        reader.readByte(): reader.read(),
    };
    return AppSettings(
      currency: fields[0] as String,
      onboardingComplete: fields[1] as bool,
      locale: fields[2] as String,
      lastSeenMonthKey: fields[3] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, AppSettings obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.currency)
      ..writeByte(1)
      ..write(obj.onboardingComplete)
      ..writeByte(2)
      ..write(obj.locale)
      ..writeByte(3)
      ..write(obj.lastSeenMonthKey);
  }
}
