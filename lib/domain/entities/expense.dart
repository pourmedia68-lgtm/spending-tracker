class Expense {
  const Expense({
    required this.id,
    required this.categoryId,
    required this.amount,
    required this.date,
    this.note,
  });

  final String id;
  final String categoryId;
  final double amount;
  final DateTime date;
  final String? note;

  Expense copyWith({
    String? id,
    String? categoryId,
    double? amount,
    DateTime? date,
    String? note,
  }) {
    return Expense(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      amount: amount ?? this.amount,
      date: date ?? this.date,
      note: note ?? this.note,
    );
  }
}
