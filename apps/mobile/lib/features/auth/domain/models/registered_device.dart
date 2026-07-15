final class RegisteredDevice {
  final String id;
  final String deviceName;
  final String platform;
  final String appVersion;
  final DateTime lastSeenAt;
  final bool isActive;

  const RegisteredDevice({
    required this.id,
    required this.deviceName,
    required this.platform,
    required this.appVersion,
    required this.lastSeenAt,
    required this.isActive,
  });
}
