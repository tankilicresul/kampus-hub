enum DeviceRegistrationStatus {
  registered,
  deviceLimitReached,
}

final class DeviceRegistrationResult {
  final DeviceRegistrationStatus status;
  final String? deviceId;

  const DeviceRegistrationResult({
    required this.status,
    this.deviceId,
  });
}
