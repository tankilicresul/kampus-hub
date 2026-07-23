import 'package:kapindahub/core/result/app_result.dart';
import '../models/registered_device.dart';
import '../models/device_registration_result.dart';

abstract interface class DeviceSecurityRepository {
  Future<AppResult<DeviceRegistrationResult>> registerCurrentDevice({
    required String appVersion,
    required String pushToken,
  });

  Future<AppResult<List<RegisteredDevice>>> listActiveDevices();

  Future<AppResult<void>> revokeDevice(String deviceId);

  Future<AppResult<bool>> isBiometricEnabled();

  Future<AppResult<void>> setBiometricEnabled(bool enabled);

  Future<AppResult<String>> getOrCreateDeviceHash();
}
