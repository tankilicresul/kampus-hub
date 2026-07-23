import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import 'package:kapindahub/core/constants/constants.dart';
import 'package:kapindahub/core/logging/app_logger.dart';
import 'package:kapindahub/core/result/app_result.dart';
import 'package:kapindahub/core/errors/app_failure.dart';
import 'package:kapindahub/core/errors/failure_mapper.dart';
import 'package:kapindahub/core/async/operation_class.dart';
import 'package:kapindahub/core/async/retry_policy.dart';
import 'package:kapindahub/core/async/timeout_policy.dart';
import '../../domain/models/registered_device.dart';
import '../../domain/models/device_registration_result.dart';
import '../../domain/repositories/device_security_repository.dart';

final class SupabaseDeviceSecurityRepository implements DeviceSecurityRepository {
  final SupabaseClient supabase;
  final FlutterSecureStorage storage;
  final DeviceInfoPlugin deviceInfo;
  final AppLogger logger;

  const SupabaseDeviceSecurityRepository(
    this.supabase,
    this.storage,
    this.deviceInfo, {
    this.logger = const NoopAppLogger(),
  });

  @override
  Future<AppResult<String>> getOrCreateDeviceHash() async {
    const op = OperationClass.localDeviceOperation;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      String? deviceUuid = await storage.read(
        key: AppConstants.keyRegisteredDeviceHash,
      ).timeout(timeout);

      if (deviceUuid == null) {
        deviceUuid = const Uuid().v4();
        await storage.write(
          key: AppConstants.keyRegisteredDeviceHash,
          value: deviceUuid,
        ).timeout(timeout);
      }

      final hashBytes = utf8.encode(deviceUuid);
      final hash = sha256.convert(hashBytes).toString();

      return AppSuccess(hash);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('getOrCreateDeviceHash failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<bool>> isBiometricEnabled() async {
    const op = OperationClass.localDeviceOperation;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      final value = await storage.read(
        key: AppConstants.keyIsBiometricEnabled,
      ).timeout(timeout);
      return AppSuccess(value == 'true');
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('isBiometricEnabled failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<void>> setBiometricEnabled(bool enabled) async {
    const op = OperationClass.localDeviceOperation;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      await storage.write(
        key: AppConstants.keyIsBiometricEnabled,
        value: enabled ? 'true' : 'false',
      ).timeout(timeout);
      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('setBiometricEnabled failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<DeviceRegistrationResult>> registerCurrentDevice({
    required String appVersion,
    required String pushToken,
  }) async {
    const op = OperationClass.idempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    final hashResult = await getOrCreateDeviceHash();
    if (hashResult is AppError<String>) {
      return AppError(hashResult.failure);
    }
    final hash = hashResult.valueOrNull!;

    String name = 'Unknown Device';
    String platform = Platform.isAndroid ? 'Android' : 'iOS';

    try {
      if (Platform.isAndroid) {
        final info = await deviceInfo.androidInfo.timeout(timeout);
        name = '${info.brand} ${info.model}';
      } else if (Platform.isIOS) {
        final info = await deviceInfo.iosInfo.timeout(timeout);
        name = info.name;
      }
    } catch (e) {
      // Platform info fetch failure must not crash flow; fallback to defaults.
    }

    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase.rpc(
          'register_current_device',
          params: {
            'p_device_hash': hash,
            'p_device_name': name,
            'p_platform': platform,
            'p_app_version': appVersion,
            'p_push_token': pushToken,
          },
        ).timeout(timeout);

        if (response is! Map) {
          throw const DatabaseFailure(
            technicalMessage: 'register_current_device RPC did not return a Map',
          );
        }

        final success = response['success'];
        if (success is! bool) {
          throw const ValidationFailure(
            technicalMessage: 'register_current_device RPC response missing success field',
          );
        }

        if (success) {
          final deviceId = response['device_id'] as String?;
          return AppSuccess(
            DeviceRegistrationResult(
              status: DeviceRegistrationStatus.registered,
              deviceId: deviceId,
            ),
          );
        } else {
          final errStr = response['error'] as String?;
          if (errStr == 'DEVICE_LIMIT_REACHED') {
            return const AppSuccess(
              DeviceRegistrationResult(
                status: DeviceRegistrationStatus.deviceLimitReached,
              ),
            );
          } else {
            throw DeviceSecurityFailure(
              technicalMessage: 'Device registration RPC failed: $errStr',
            );
          }
        }
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
          hasIdempotencyProtection: true,
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'registerCurrentDevice attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'registerCurrentDevice final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<List<RegisteredDevice>>> listActiveDevices() async {
    const op = OperationClass.safeRead;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase.rpc(
          'list_current_user_devices',
        ).timeout(timeout);

        if (response is! List) {
          throw const DatabaseFailure(
            technicalMessage: 'list_current_user_devices RPC did not return a List',
          );
        }

        final devices = <RegisteredDevice>[];
        for (final item in response) {
          if (item is! Map) {
            throw const ValidationFailure(
              technicalMessage: 'Device item in list is not a Map',
            );
          }

          final id = item['id'];
          final deviceName = item['device_name'];
          final platform = item['platform'];
          final appVersion = item['app_version'];
          final lastSeenAtStr = item['last_seen_at'];
          final isActive = item['is_active'];

          if (id is! String ||
              deviceName is! String ||
              platform is! String ||
              appVersion is! String ||
              lastSeenAtStr is! String ||
              isActive is! bool) {
            throw const ValidationFailure(
              technicalMessage: 'Device item is missing required fields or has invalid types',
            );
          }

          final lastSeenAt = DateTime.tryParse(lastSeenAtStr);
          if (lastSeenAt == null) {
            throw const ValidationFailure(
              technicalMessage: 'Failed to parse last_seen_at timestamp',
            );
          }

          devices.add(
            RegisteredDevice(
              id: id,
              deviceName: deviceName,
              platform: platform,
              appVersion: appVersion,
              lastSeenAt: lastSeenAt,
              isActive: isActive,
            ),
          );
        }

        return AppSuccess(devices);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'listActiveDevices attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'listActiveDevices final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> revokeDevice(String deviceId) async {
    const op = OperationClass.idempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase.rpc(
          'revoke_current_user_device',
          params: {
            'p_device_id': deviceId,
          },
        ).timeout(timeout);

        if (response is! Map) {
          throw const DatabaseFailure(
            technicalMessage: 'revoke_current_user_device RPC did not return a Map',
          );
        }

        final success = response['success'];
        if (success is! bool) {
          throw const ValidationFailure(
            technicalMessage: 'revoke_current_user_device RPC response missing success field',
          );
        }

        if (success) {
          return const AppSuccess(null);
        } else {
          final errStr = response['error'] as String?;
          throw DeviceSecurityFailure(
            technicalMessage: 'Device revocation failed: $errStr',
          );
        }
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
          hasIdempotencyProtection: true,
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'revokeDevice attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'revokeDevice final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }
}
