import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

class SpendingTrackerApp extends ConsumerWidget {
  const SpendingTrackerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'Spending Tracker',
      theme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      darkTheme: AppTheme.dark(),
      routerConfig: router,
    );
  }
}
