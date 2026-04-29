import 'package:hive/hive.dart';

import '../../domain/entities/app_settings.dart';
import '../local/hive_boxes.dart';

class SettingsRepository {
  SettingsRepository(this._box);

  factory SettingsRepository.fromHive() =>
      SettingsRepository(Hive.box<AppSettings>(HiveBoxNames.settings));

  static const _key = 'app_settings';

  final Box<AppSettings> _box;

  Stream<void> changes() => _box.watch(key: _key).map((_) {});

  AppSettings get() => _box.get(_key) ?? AppSettings.initial;

  Future<void> save(AppSettings settings) => _box.put(_key, settings);
}
