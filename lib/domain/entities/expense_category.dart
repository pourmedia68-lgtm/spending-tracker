import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

/// A spending category (e.g. Food, Transport).
///
/// Categories are immutable and identified by [id]. Their visual metadata
/// (color, gradient, icon) lives in the app (not in the DB) and is resolved
/// from [id] via [CategoryCatalog].
class ExpenseCategory {
  const ExpenseCategory({
    required this.id,
    required this.name,
    required this.group,
    required this.color,
    required this.gradient,
    required this.iconData,
  });

  final String id;
  final String name;
  final String group;
  final Color color;
  final LinearGradient gradient;
  final IconData iconData;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is ExpenseCategory && other.id == id);

  @override
  int get hashCode => id.hashCode;
}

/// Static catalog of built-in categories.
///
/// The brief lists a rich subcategory tree. For the MVP we expose the 9
/// top-level categories; each subcategory can be added later without
/// changing the budget engine.
abstract final class CategoryCatalog {
  static const String lifestyleId = 'lifestyle';
  static const String transportId = 'transport';
  static const String homeId = 'home';
  static const String workId = 'work';
  static const String healthId = 'health';
  static const String educationId = 'education';
  static const String travelId = 'travel';
  static const String financeId = 'finance';
  static const String entertainmentId = 'entertainment';

  static final List<ExpenseCategory> all = [
    ExpenseCategory(
      id: lifestyleId,
      name: 'Lifestyle',
      group: 'Lifestyle',
      color: const Color(0xFFFF7A7A),
      gradient: const LinearGradient(
        colors: [Color(0xFFFF6B6B), Color(0xFFFFB347)],
      ),
      iconData: PhosphorIconsDuotone.forkKnife,
    ),
    ExpenseCategory(
      id: transportId,
      name: 'Transport',
      group: 'Transport',
      color: const Color(0xFF4DA3FF),
      gradient: const LinearGradient(
        colors: [Color(0xFF4DA3FF), Color(0xFF7B61FF)],
      ),
      iconData: PhosphorIconsDuotone.car,
    ),
    ExpenseCategory(
      id: homeId,
      name: 'Home',
      group: 'Home',
      color: const Color(0xFF47D1B8),
      gradient: const LinearGradient(
        colors: [Color(0xFF00E5D1), Color(0xFF2ECC71)],
      ),
      iconData: PhosphorIconsDuotone.house,
    ),
    ExpenseCategory(
      id: workId,
      name: 'Work',
      group: 'Work',
      color: const Color(0xFFA29BFE),
      gradient: const LinearGradient(
        colors: [Color(0xFF6C5CE7), Color(0xFFA29BFE)],
      ),
      iconData: PhosphorIconsDuotone.briefcase,
    ),
    ExpenseCategory(
      id: healthId,
      name: 'Health',
      group: 'Health',
      color: const Color(0xFFFF6B9E),
      gradient: const LinearGradient(
        colors: [Color(0xFFFF4D6D), Color(0xFFFF9A9E)],
      ),
      iconData: PhosphorIconsDuotone.heartbeat,
    ),
    ExpenseCategory(
      id: educationId,
      name: 'Education',
      group: 'Education',
      color: const Color(0xFFFFCF6B),
      gradient: const LinearGradient(
        colors: [Color(0xFFFFCF6B), Color(0xFFFF9A5A)],
      ),
      iconData: PhosphorIconsDuotone.graduationCap,
    ),
    ExpenseCategory(
      id: travelId,
      name: 'Travel',
      group: 'Travel',
      color: const Color(0xFF5EE2FF),
      gradient: const LinearGradient(
        colors: [Color(0xFF4DA3FF), Color(0xFF00E5D1)],
      ),
      iconData: PhosphorIconsDuotone.airplaneTilt,
    ),
    ExpenseCategory(
      id: financeId,
      name: 'Finance',
      group: 'Finance',
      color: const Color(0xFFFFCF6B),
      gradient: const LinearGradient(
        colors: [Color(0xFFFFCF6B), Color(0xFFFFA07A)],
      ),
      iconData: PhosphorIconsDuotone.chartLineUp,
    ),
    ExpenseCategory(
      id: entertainmentId,
      name: 'Entertainment',
      group: 'Entertainment',
      color: const Color(0xFFB388FF),
      gradient: const LinearGradient(
        colors: [Color(0xFF7C4DFF), Color(0xFFFF4DBE)],
      ),
      iconData: PhosphorIconsDuotone.gameController,
    ),
  ];

  static ExpenseCategory byId(String id) {
    return all.firstWhere(
      (c) => c.id == id,
      orElse: () => ExpenseCategory(
        id: id,
        name: id,
        group: 'Other',
        color: const Color(0xFF9BA3C0),
        gradient: const LinearGradient(
          colors: [Color(0xFF5A6388), Color(0xFF9BA3C0)],
        ),
        iconData: PhosphorIconsDuotone.tag,
      ),
    );
  }
}
