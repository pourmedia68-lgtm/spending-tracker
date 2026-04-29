/// Sentinel used by [AppSettings.copyWith] to distinguish "leave the field
/// untouched" from "set the field to null" for nullable parameters.
const Object _unset = Object();

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
    Object? lastSeenMonthKey = _unset,
  }) {
    return AppSettings(
      currency: currency ?? this.currency,
      onboardingComplete: onboardingComplete ?? this.onboardingComplete,
      locale: locale ?? this.locale,
      lastSeenMonthKey: identical(lastSeenMonthKey, _unset)
          ? this.lastSeenMonthKey
          : lastSeenMonthKey as String?,
    );
  }

  static const AppSettings initial = AppSettings(
    currency: 'EUR',
    onboardingComplete: false,
    locale: 'en_US',
  );
}
