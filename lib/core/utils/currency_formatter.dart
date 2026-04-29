import 'package:intl/intl.dart';

class CurrencyFormatter {
  CurrencyFormatter(this.code, {this.locale = 'en_US'})
      : _full = NumberFormat.currency(
          locale: locale,
          symbol: _symbolFor(code),
          decimalDigits: 2,
        ),
        _compact = NumberFormat.compactCurrency(
          locale: locale,
          symbol: _symbolFor(code),
          decimalDigits: 1,
        );

  final String code;
  final String locale;
  final NumberFormat _full;
  final NumberFormat _compact;

  String format(num amount) => _full.format(amount);

  String compact(num amount) {
    if (amount.abs() < 1000) return _full.format(amount);
    return _compact.format(amount);
  }

  String get symbol => _symbolFor(code);

  static String _symbolFor(String code) {
    switch (code.toUpperCase()) {
      case 'EUR':
        return '€';
      case 'USD':
        return r'$';
      case 'GBP':
        return '£';
      case 'JPY':
        return '¥';
      case 'CHF':
        return 'CHF ';
      case 'CAD':
        return r'C$';
      case 'AUD':
        return r'A$';
      case 'MAD':
        return 'DH ';
      default:
        return '$code ';
    }
  }
}
