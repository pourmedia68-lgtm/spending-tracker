import 'package:flutter/material.dart';

/// Fintech-grade palette — deep navy base with neon accents.
abstract final class AppColors {
  // Base surfaces
  static const Color bg = Color(0xFF0A0E1A);
  static const Color bgElevated = Color(0xFF11162A);
  static const Color surface = Color(0xFF161C33);
  static const Color surfaceHigh = Color(0xFF1E2541);
  static const Color divider = Color(0x1AFFFFFF);

  // Brand accents
  static const Color primary = Color(0xFF6C5CE7);
  static const Color primaryGlow = Color(0xFFA29BFE);
  static const Color accent = Color(0xFF00E5D1);
  static const Color gold = Color(0xFFFFCF6B);

  // Semantic
  static const Color success = Color(0xFF2ECC71);
  static const Color warning = Color(0xFFFFB547);
  static const Color danger = Color(0xFFFF4D6D);
  static const Color info = Color(0xFF4DA3FF);

  // Text
  static const Color textPrimary = Color(0xFFF5F7FB);
  static const Color textSecondary = Color(0xFF9BA3C0);
  static const Color textMuted = Color(0xFF5A6388);

  // Gradients
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF6C5CE7), Color(0xFF00E5D1)],
  );

  static const LinearGradient dangerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF4D6D), Color(0xFFFF9A5A)],
  );

  static const LinearGradient successGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2ECC71), Color(0xFF00E5D1)],
  );

  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A2142), Color(0xFF0F1530)],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF3D2E8F),
      Color(0xFF17234C),
      Color(0xFF0D3C4A),
    ],
    stops: [0.0, 0.55, 1.0],
  );
}
