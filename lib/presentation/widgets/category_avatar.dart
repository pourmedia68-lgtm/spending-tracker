import 'package:flutter/material.dart';

import '../../domain/entities/expense_category.dart';

/// Glossy gradient square that displays the category's icon.
class CategoryAvatar extends StatelessWidget {
  const CategoryAvatar({
    super.key,
    required this.category,
    this.size = 48,
    this.active = true,
  });

  final ExpenseCategory category;
  final double size;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final gradient = active
        ? category.gradient
        : LinearGradient(
            colors: [
              category.color.withValues(alpha: 0.25),
              category.color.withValues(alpha: 0.1),
            ],
          );

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(size * 0.32),
        boxShadow: [
          if (active)
            BoxShadow(
              color: category.color.withValues(alpha: 0.35),
              blurRadius: size * 0.4,
              offset: Offset(0, size * 0.2),
              spreadRadius: -size * 0.1,
            ),
        ],
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Icon(
        category.iconData,
        color: Colors.white,
        size: size * 0.55,
      ),
    );
  }
}
