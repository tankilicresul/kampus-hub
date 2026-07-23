import 'package:flutter/foundation.dart';

abstract class NotificationService {
  Future<void> initialize();
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  });
}

class NoopNotificationService implements NotificationService {
  const NoopNotificationService();

  @override
  Future<void> initialize() async {}

  @override
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    debugPrint('Notification: [$title] $body (payload: $payload)');
  }
}
