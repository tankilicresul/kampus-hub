enum AppRetryHint {
  none,
  possible,
  verifyServerState,
}

sealed class AppFailure {
  final String code;
  final String userMessage;
  final String? technicalMessage;
  final Object? cause;
  final StackTrace? stackTrace;
  final AppRetryHint retryHint;

  const AppFailure({
    required this.code,
    required this.userMessage,
    this.technicalMessage,
    this.cause,
    this.stackTrace,
    required this.retryHint,
  });
}

class NetworkFailure extends AppFailure {
  const NetworkFailure({
    super.code = 'network_failure',
    super.userMessage = 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.possible,
  });
}

class TimeoutFailure extends AppFailure {
  const TimeoutFailure({
    super.code = 'timeout_failure',
    super.userMessage = 'İşlem beklenenden uzun sürdü.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.possible,
  });
}

class ServiceUnavailableFailure extends AppFailure {
  const ServiceUnavailableFailure({
    super.code = 'service_unavailable',
    super.userMessage = 'Hizmet şu anda geçici olarak kullanılamıyor.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.verifyServerState,
  });
}

class AuthenticationFailure extends AppFailure {
  const AuthenticationFailure({
    super.code = 'authentication_failure',
    super.userMessage = 'Oturumunuz geçersiz veya süresi dolmuş.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class PermissionFailure extends AppFailure {
  const PermissionFailure({
    super.code = 'permission_failure',
    super.userMessage = 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class ValidationFailure extends AppFailure {
  const ValidationFailure({
    super.code = 'validation_failure',
    super.userMessage = 'Girilen bilgileri kontrol edin.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class ConflictFailure extends AppFailure {
  const ConflictFailure({
    super.code = 'conflict_failure',
    super.userMessage = 'Bu işlem mevcut bir kayıtla çakışıyor.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class DatabaseFailure extends AppFailure {
  const DatabaseFailure({
    super.code = 'database_failure',
    super.userMessage = 'İşlem sırasında bir veri hatası oluştu.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class DeviceSecurityFailure extends AppFailure {
  const DeviceSecurityFailure({
    super.code = 'device_security_failure',
    super.userMessage = 'Cihaz güvenliği doğrulanamadı.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class ConfigurationFailure extends AppFailure {
  const ConfigurationFailure({
    super.code = 'configuration_failure',
    super.userMessage = 'Uygulama yapılandırması eksik.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}

class UnknownFailure extends AppFailure {
  const UnknownFailure({
    super.code = 'unknown_failure',
    super.userMessage = 'Beklenmeyen bir hata oluştu.',
    super.technicalMessage,
    super.cause,
    super.stackTrace,
    super.retryHint = AppRetryHint.none,
  });
}
