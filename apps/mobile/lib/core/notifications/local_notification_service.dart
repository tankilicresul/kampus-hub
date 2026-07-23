import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'notification_service.dart';

class LocalNotificationService implements NotificationService {
  bool _initialized = false;

  @override
  Future<void> initialize() async {
    _initialized = true;
    debugPrint('NotificationService: initialized successfully');
  }

  @override
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) {
      await initialize();
    }
    debugPrint('🔔 [NOTIFICATION] ($id) $title: $body (payload: $payload)');
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return LocalNotificationService();
});
