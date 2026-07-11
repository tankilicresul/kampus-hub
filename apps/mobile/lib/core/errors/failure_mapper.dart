import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_failure.dart';

abstract final class FailureMapper {
  static AppFailure map(
    Object error, {
    StackTrace? stackTrace,
    String? domainCode,
    int? httpStatus,
  }) {
    try {
      // 1. If error is already AppFailure, return it directly
      if (error is AppFailure) {
        return error;
      }

      // 2. Evaluate domainCode
      if (domainCode != null) {
        final domainFailure = _mapDomainCode(domainCode, error, stackTrace);
        if (domainFailure != null) {
          return domainFailure;
        }
      }

      // 3. Evaluate httpStatus
      if (httpStatus != null) {
        final httpFailure = _mapHttpStatus(httpStatus, error, stackTrace);
        if (httpFailure != null) {
          return httpFailure;
        }
      }

      // 4. Evaluate specific exception types
      if (error is PostgrestException) {
        return _mapPostgrestException(error, stackTrace);
      }

      if (error is AuthException) {
        return _mapAuthException(error, stackTrace);
      }

      if (error is SocketException) {
        return NetworkFailure(
          technicalMessage: error.message,
          cause: error,
          stackTrace: stackTrace,
          retryHint: AppRetryHint.possible,
        );
      }

      if (error is TimeoutException) {
        return TimeoutFailure(
          technicalMessage: error.message ?? 'Zaman aşımı',
          cause: error,
          stackTrace: stackTrace,
          retryHint: AppRetryHint.verifyServerState,
        );
      }

      if (error is PlatformException) {
        return _mapPlatformException(error, stackTrace);
      }

      if (error is FormatException) {
        return ValidationFailure(
          technicalMessage: error.message,
          cause: error,
          stackTrace: stackTrace,
        );
      }

      if (error is StateError) {
        return UnknownFailure(
          technicalMessage: error.message,
          cause: error,
          stackTrace: stackTrace,
        );
      }

      return UnknownFailure(
        technicalMessage: error.toString(),
        cause: error,
        stackTrace: stackTrace,
      );
    } catch (e, st) {
      // In case failure mapper itself fails, fallback to UnknownFailure
      return UnknownFailure(
        technicalMessage: 'FailureMapper error: ${e.toString()}',
        cause: e,
        stackTrace: st,
      );
    }
  }

  static AppFailure? _mapDomainCode(String domainCode, Object cause, StackTrace? stackTrace) {
    switch (domainCode) {
      case 'permission_denied':
        return PermissionFailure(
          technicalMessage: 'Domain: permission_denied',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 'authentication_required':
        return AuthenticationFailure(
          technicalMessage: 'Domain: authentication_required',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 'validation_failed':
        return ValidationFailure(
          technicalMessage: 'Domain: validation_failed',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 'conflict':
        return ConflictFailure(
          technicalMessage: 'Domain: conflict',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 'service_unavailable':
        return ServiceUnavailableFailure(
          technicalMessage: 'Domain: service_unavailable',
          cause: cause,
          stackTrace: stackTrace,
          retryHint: AppRetryHint.possible,
        );
      case 'device_security_failed':
        return DeviceSecurityFailure(
          technicalMessage: 'Domain: device_security_failed',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 'configuration_missing':
        return ConfigurationFailure(
          technicalMessage: 'Domain: configuration_missing',
          cause: cause,
          stackTrace: stackTrace,
        );
      default:
        return null;
    }
  }

  static AppFailure? _mapHttpStatus(int httpStatus, Object cause, StackTrace? stackTrace) {
    switch (httpStatus) {
      case 401:
        return AuthenticationFailure(
          technicalMessage: 'HTTP 401 Unauthorized',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 403:
        return PermissionFailure(
          technicalMessage: 'HTTP 403 Forbidden',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 409:
        return ConflictFailure(
          technicalMessage: 'HTTP 409 Conflict',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 422:
        return ValidationFailure(
          technicalMessage: 'HTTP 422 Unprocessable Entity',
          cause: cause,
          stackTrace: stackTrace,
        );
      case 429:
        return ServiceUnavailableFailure(
          technicalMessage: 'HTTP 429 Rate Limit Exceeded',
          cause: cause,
          stackTrace: stackTrace,
          retryHint: AppRetryHint.possible,
        );
      case 502:
      case 503:
      case 504:
        return ServiceUnavailableFailure(
          technicalMessage: 'HTTP $httpStatus Service Unavailable',
          cause: cause,
          stackTrace: stackTrace,
          retryHint: AppRetryHint.possible,
        );
      default:
        return null;
    }
  }

  static AppFailure _mapPostgrestException(PostgrestException error, StackTrace? stackTrace) {
    final code = error.code;
    final message = error.message;

    if (code == '23505') {
      return ConflictFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (code == '23503' || code == '23514') {
      return ValidationFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (code == '42501') {
      return PermissionFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (code != null && (code == 'PGRST301' || code.startsWith('PGRST3') || message.contains('JWT'))) {
      return AuthenticationFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (code == 'P0001') {
      final lowercaseMsg = message.toLowerCase();
      if (lowercaseMsg.contains('access denied') ||
          lowercaseMsg.contains('permission') ||
          lowercaseMsg.contains('not allowed')) {
        return PermissionFailure(
          technicalMessage: message,
          cause: error,
          stackTrace: stackTrace,
        );
      }
      if (lowercaseMsg.contains('invalid') ||
          lowercaseMsg.contains('required') ||
          lowercaseMsg.contains('expired invitation')) {
        return ValidationFailure(
          technicalMessage: message,
          cause: error,
          stackTrace: stackTrace,
        );
      }
      return DatabaseFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }

    return DatabaseFailure(
      code: code ?? 'database_failure',
      technicalMessage: message,
      cause: error,
      stackTrace: stackTrace,
    );
  }

  static AppFailure _mapAuthException(AuthException error, StackTrace? stackTrace) {
    final status = error.statusCode != null ? int.tryParse(error.statusCode!) : null;
    final message = error.message;

    if (status == 401) {
      return AuthenticationFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (status == 403) {
      return PermissionFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
      );
    }
    if (status == 429) {
      return ServiceUnavailableFailure(
        technicalMessage: 'Rate limit exceeded: $message',
        cause: error,
        stackTrace: stackTrace,
        retryHint: AppRetryHint.possible,
      );
    }
    if (status == 502 || status == 503 || status == 504) {
      return ServiceUnavailableFailure(
        technicalMessage: message,
        cause: error,
        stackTrace: stackTrace,
        retryHint: AppRetryHint.possible,
      );
    }

    return AuthenticationFailure(
      technicalMessage: message,
      cause: error,
      stackTrace: stackTrace,
    );
  }

  static AppFailure _mapPlatformException(PlatformException error, StackTrace? stackTrace) {
    final code = error.code.toLowerCase();
    final message = error.message?.toLowerCase() ?? '';

    final isBiometricOrSecureStorage = code.contains('biometric') ||
        code.contains('auth') ||
        code.contains('secure') ||
        code.contains('keyguard') ||
        code.contains('credential') ||
        code.contains('fingerprint') ||
        code.contains('face') ||
        code.contains('hardware') ||
        code.contains('passcode') ||
        message.contains('biometric') ||
        message.contains('auth') ||
        message.contains('secure') ||
        message.contains('keyguard') ||
        message.contains('credential') ||
        message.contains('fingerprint') ||
        message.contains('face');

    if (isBiometricOrSecureStorage) {
      return DeviceSecurityFailure(
        technicalMessage: error.message ?? error.code,
        cause: error,
        stackTrace: stackTrace,
      );
    }

    return UnknownFailure(
      technicalMessage: error.message ?? error.code,
      cause: error,
      stackTrace: stackTrace,
    );
  }
}
