/// Date helpers for month cycles.
///
/// Everything here is pure — no Flutter, no DB, no providers.
class AppDateUtils {
  const AppDateUtils._();

  /// Returns the first moment (00:00:00) of the month containing [date].
  static DateTime startOfMonth(DateTime date) =>
      DateTime(date.year, date.month, 1);

  /// Returns the last moment (23:59:59.999) of the month containing [date].
  static DateTime endOfMonth(DateTime date) {
    final firstOfNext = DateTime(date.year, date.month + 1, 1);
    return firstOfNext.subtract(const Duration(milliseconds: 1));
  }

  /// Returns the number of days in the month containing [date].
  static int daysInMonth(DateTime date) {
    final firstOfNext = DateTime(date.year, date.month + 1, 1);
    return firstOfNext.subtract(const Duration(days: 1)).day;
  }

  /// Number of days remaining **including** [from]. Always `>= 1`.
  static int daysRemainingInclusive(DateTime from) {
    final end = endOfMonth(from);
    final diff = end.difference(DateTime(from.year, from.month, from.day)).inDays + 1;
    return diff.clamp(1, 366);
  }

  /// Number of days elapsed in the month **including** [at]. Always `>= 1`.
  static int daysElapsedInclusive(DateTime at) {
    return at.day;
  }

  /// Returns a unique month key like `2026-04` for [date].
  static String monthKey(DateTime date) {
    final m = date.month.toString().padLeft(2, '0');
    return '${date.year}-$m';
  }

  /// Parses a month key back to the first day of that month.
  /// Returns `null` for malformed keys.
  static DateTime? parseMonthKey(String key) {
    final parts = key.split('-');
    if (parts.length != 2) return null;
    final y = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (y == null || m == null || m < 1 || m > 12) return null;
    return DateTime(y, m);
  }

  /// Returns the first day of the previous month.
  static DateTime previousMonth(DateTime date) =>
      DateTime(date.year, date.month - 1, 1);
}
