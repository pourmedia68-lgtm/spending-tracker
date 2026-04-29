import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Full-bleed hero gradient used behind the dashboard header.
class GradientBackground extends StatelessWidget {
  const GradientBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(gradient: AppColors.heroGradient),
          ),
        ),
        Positioned(
          top: -120,
          right: -80,
          child: _Blob(color: AppColors.primary.withValues(alpha: 0.35)),
        ),
        Positioned(
          top: 180,
          left: -100,
          child: _Blob(color: AppColors.accent.withValues(alpha: 0.25)),
        ),
        Positioned.fill(child: child),
      ],
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: 320,
        height: 320,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, Colors.transparent],
          ),
        ),
      ),
    );
  }
}
