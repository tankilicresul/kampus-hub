import 'package:flutter_test/flutter_test.dart';
import 'package:kapindahub/core/errors/app_failure.dart';
import 'package:kapindahub/core/result/app_result.dart';

void main() {
  group('AppFailure Instantiation & Metadata Tests', () {
    test('11 concrete AppFailure subclasses instantiation and defaults', () {
      const causeObj = 'Database Timeout';
      final st = StackTrace.current;

      const network = NetworkFailure(
        technicalMessage: 'Conn timeout',
      );
      expect(network.code, 'network_failure');
      expect(network.userMessage, 'İnternet bağlantınızı kontrol edip tekrar deneyin.');
      expect(network.technicalMessage, 'Conn timeout');
      expect(network.retryHint, AppRetryHint.possible);

      const timeout = TimeoutFailure(
        technicalMessage: 'RPC took too long',
      );
      expect(timeout.code, 'timeout_failure');
      expect(timeout.userMessage, 'İşlem beklenenden uzun sürdü.');
      expect(timeout.technicalMessage, 'RPC took too long');
      expect(timeout.retryHint, AppRetryHint.possible);

      const serviceUnavailable = ServiceUnavailableFailure(
        technicalMessage: 'HTTP 503 Service Unavailable',
      );
      expect(serviceUnavailable.code, 'service_unavailable');
      expect(serviceUnavailable.userMessage, 'Hizmet şu anda geçici olarak kullanılamıyor.');
      expect(serviceUnavailable.technicalMessage, 'HTTP 503 Service Unavailable');
      expect(serviceUnavailable.retryHint, AppRetryHint.verifyServerState);

      const authentication = AuthenticationFailure(
        technicalMessage: 'JWT Expired',
      );
      expect(authentication.code, 'authentication_failure');
      expect(authentication.userMessage, 'Oturumunuz geçersiz veya süresi dolmuş.');
      expect(authentication.technicalMessage, 'JWT Expired');
      expect(authentication.retryHint, AppRetryHint.none);

      const permission = PermissionFailure(
        technicalMessage: 'RLS 42501 restriction',
      );
      expect(permission.code, 'permission_failure');
      expect(permission.userMessage, 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.');
      expect(permission.technicalMessage, 'RLS 42501 restriction');
      expect(permission.retryHint, AppRetryHint.none);

      const validation = ValidationFailure(
        technicalMessage: 'Email address missing domain',
      );
      expect(validation.code, 'validation_failure');
      expect(validation.userMessage, 'Girilen bilgileri kontrol edin.');
      expect(validation.technicalMessage, 'Email address missing domain');
      expect(validation.retryHint, AppRetryHint.none);

      const conflict = ConflictFailure(
        technicalMessage: 'Constraint violate key_uniq',
      );
      expect(conflict.code, 'conflict_failure');
      expect(conflict.userMessage, 'Bu işlem mevcut bir kayıtla çakışıyor.');
      expect(conflict.technicalMessage, 'Constraint violate key_uniq');
      expect(conflict.retryHint, AppRetryHint.none);

      final database = DatabaseFailure(
        technicalMessage: 'Broken pipe connection',
        cause: causeObj,
        stackTrace: st,
      );
      expect(database.code, 'database_failure');
      expect(database.userMessage, 'İşlem sırasında bir veri hatası oluştu.');
      expect(database.technicalMessage, 'Broken pipe connection');
      expect(database.cause, causeObj);
      expect(database.stackTrace, st);
      expect(database.retryHint, AppRetryHint.none);

      const deviceSecurity = DeviceSecurityFailure(
        technicalMessage: 'Keyguard credentials unavailable',
      );
      expect(deviceSecurity.code, 'device_security_failure');
      expect(deviceSecurity.userMessage, 'Cihaz güvenliği doğrulanamadı.');
      expect(deviceSecurity.technicalMessage, 'Keyguard credentials unavailable');
      expect(deviceSecurity.retryHint, AppRetryHint.none);

      const configuration = ConfigurationFailure(
        technicalMessage: 'Missing SUPABASE_URL key in .env',
      );
      expect(configuration.code, 'configuration_failure');
      expect(configuration.userMessage, 'Uygulama yapılandırması eksik.');
      expect(configuration.technicalMessage, 'Missing SUPABASE_URL key in .env');
      expect(configuration.retryHint, AppRetryHint.none);

      const unknown = UnknownFailure(
        technicalMessage: 'NullPointerException inside platform channel',
      );
      expect(unknown.code, 'unknown_failure');
      expect(unknown.userMessage, 'Beklenmeyen bir hata oluştu.');
      expect(unknown.technicalMessage, 'NullPointerException inside platform channel');
      expect(unknown.retryHint, AppRetryHint.none);
    });

    test('Custom properties can override default parameters in constructor', () {
      const customFail = UnknownFailure(
        code: 'custom_err_code',
        userMessage: 'Özel hata iletisi.',
        technicalMessage: 'Raw logs details',
        retryHint: AppRetryHint.verifyServerState,
      );
      expect(customFail.code, 'custom_err_code');
      expect(customFail.userMessage, 'Özel hata iletisi.');
      expect(customFail.technicalMessage, 'Raw logs details');
      expect(customFail.retryHint, AppRetryHint.verifyServerState);
    });

    test('ServiceUnavailableFailure is distinct from NetworkFailure', () {
      const netErr = NetworkFailure();
      const svcErr = ServiceUnavailableFailure();
      expect(netErr.code, isNot(svcErr.code));
      expect(netErr.retryHint, isNot(svcErr.retryHint));
      expect(netErr.userMessage, isNot(svcErr.userMessage));
    });
  });

  group('AppResult - AppSuccess Variant Tests', () {
    test('AppSuccess properties and getters', () {
      const resultVal = 'Operation Success Data';
      const result = AppSuccess<String>(resultVal);

      expect(result.isSuccess, isTrue);
      expect(result.isError, isFalse);
      expect(result.valueOrNull, resultVal);
      expect(result.failureOrNull, null);
    });

    test('AppSuccess fold and when routing execution', () {
      const result = AppSuccess<int>(42);
      bool successCalled = false;
      bool errorCalled = false;

      final foldVal = result.fold<String>(
        onSuccess: (val) {
          successCalled = true;
          return 'Value: $val';
        },
        onError: (fail) {
          errorCalled = true;
          return 'Error';
        },
      );
      expect(foldVal, 'Value: 42');
      expect(successCalled, isTrue);
      expect(errorCalled, isFalse);

      successCalled = false;
      errorCalled = false;

      final whenVal = result.when<String>(
        success: (val) {
          successCalled = true;
          return 'When success: $val';
        },
        error: (fail) {
          errorCalled = true;
          return 'When error';
        },
      );
      expect(whenVal, 'When success: 42');
      expect(successCalled, isTrue);
      expect(errorCalled, isFalse);
    });

    test('AppSuccess mapping operations', () {
      const result = AppSuccess<int>(10);

      // map transforms value
      final mappedResult = result.map<String>((val) => 'Count is $val');
      expect(mappedResult.isSuccess, isTrue);
      expect(mappedResult.valueOrNull, 'Count is 10');

      // mapError does not change success state
      final mappedErrorResult = result.mapError((fail) => const NetworkFailure());
      expect(mappedErrorResult.isSuccess, isTrue);
      expect(mappedErrorResult.valueOrNull, 10);
    });
  });

  group('AppResult - AppError Variant Tests', () {
    test('AppError properties and getters', () {
      const failureObj = NetworkFailure(technicalMessage: 'Timeout details');
      const result = AppError<double>(failureObj);

      expect(result.isSuccess, isFalse);
      expect(result.isError, isTrue);
      expect(result.valueOrNull, null);
      expect(result.failureOrNull, failureObj);
    });

    test('AppError fold and when routing execution', () {
      const failureObj = PermissionFailure();
      const result = AppError<String>(failureObj);
      bool successCalled = false;
      bool errorCalled = false;

      final foldVal = result.fold<String>(
        onSuccess: (val) {
          successCalled = true;
          return 'Val';
        },
        onError: (fail) {
          errorCalled = true;
          return 'Fail: ${fail.code}';
        },
      );
      expect(foldVal, 'Fail: permission_failure');
      expect(successCalled, isFalse);
      expect(errorCalled, isTrue);

      successCalled = false;
      errorCalled = false;

      final whenVal = result.when<String>(
        success: (val) {
          successCalled = true;
          return 'Success';
        },
        error: (fail) {
          errorCalled = true;
          return 'Error: ${fail.code}';
        },
      );
      expect(whenVal, 'Error: permission_failure');
      expect(successCalled, isFalse);
      expect(errorCalled, isTrue);
    });

    test('AppError mapping operations', () {
      const failureObj = ValidationFailure(technicalMessage: 'Bad inputs');
      const result = AppError<int>(failureObj);

      // map maintains failure and returns new generic type
      final mappedResult = result.map<double>((val) => val * 1.5);
      expect(mappedResult.isError, isTrue);
      expect(mappedResult.failureOrNull, failureObj);

      // mapError transforms failure
      final mappedErrorResult = result.mapError((fail) => ConflictFailure(
            technicalMessage: fail.technicalMessage,
          ));
      expect(mappedErrorResult.isError, isTrue);
      expect(mappedErrorResult.failureOrNull?.code, 'conflict_failure');
      expect(mappedErrorResult.failureOrNull?.technicalMessage, 'Bad inputs');
    });
  });
}
