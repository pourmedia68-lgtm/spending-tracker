import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

class AnimatedProgressRing extends StatelessWidget {
  const AnimatedProgressRing({
    super.key,
    required this.progress,
    required this.label,
    required this.value,
    required this.sublabel,
    this.size = 220,
    this.strokeWidth = 14,
    this.gradient = AppColors.brandGradient,
    this.trackColor = const Color(0x22FFFFFF),
  });

  /// 0..1+ (values above 1 are clamped visually).
  final double progress;
  final String label;
  final String value;
  final String sublabel;
  final double size;
  final double strokeWidth;
  final LinearGradient gradient;
  final Color trackColor;

  @override
  Widget build(BuildContext context) {
    final clamped = progress.clamp(0.0, 1.0);
    final over = progress > 1.0;
    final activeGradient = over ? AppColors.dangerGradient : gradient;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: clamped),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (context, animatedProgress, _) {
        return SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: Size.square(size),
                painter: _RingPainter(
                  progress: animatedProgress,
                  strokeWidth: strokeWidth,
                  gradient: activeGradient,
                  trackColor: trackColor,
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label.toUpperCase(), style: AppTypography.label),
                  const SizedBox(height: 6),
                  Text(
                    value,
                    style: AppTypography.displayMedium.copyWith(
                      color: over ? AppColors.danger : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(sublabel, style: AppTypography.bodyMuted),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.strokeWidth,
    required this.gradient,
    required this.trackColor,
  });

  final double progress;
  final double strokeWidth;
  final LinearGradient gradient;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth
      ..color = trackColor;
    canvas.drawCircle(center, radius, trackPaint);

    if (progress <= 0) return;

    final progressPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth
      ..shader = gradient.createShader(rect);

    final start = -pi / 2;
    final sweep = 2 * pi * progress;
    canvas.drawArc(rect, start, sweep, false, progressPaint);
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.trackColor != trackColor;
  }
}
