class AppSettings {
  const AppSettings({
    required this.currency,
    required this.onboardingComplete,
    required this.locale,
    this.lastSeenMonthKey,
  });

  final String currency;
  final bool onboardingComplete;
  final String locale;
  final String? lastSeenMonthKey;

  AppSettings copyWith({
    String? currency,
    bool? onboardingComplete,
    String? locale,
    String? lastSeenMonthKey,
  }) {
    return AppSettings(
      currency: currency ?? this.currency,
      onboardingComplete: onboardingComplete ?? this.onboardingComplete,
      locale: locale ?? this.locale,
      lastSeenMonthKey: lastSeenMonthKey ?? this.lastSeenMonthKey,
    );
  }

  static const AppSettings initial = AppSettings(
    currency: 'EUR',
    onboardingComplete: false,
    locale: 'en_US',
  );
}
