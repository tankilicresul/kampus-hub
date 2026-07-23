import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kapindahub/core/errors/app_failure.dart';
import 'package:kapindahub/core/errors/failure_mapper.dart';

void main() {
  group('FailureMapper - 25 Target Assertions Unit Tests', () {
    final testStackTrace = StackTrace.fromString('Mock test stack trace');

    test('1. AppFailure is preserved as is', () {
      const original = NetworkFailure(technicalMessage: 'Preserved');
      final result = FailureMapper.map(original);
      expect(result, same(original));
    });

    test('2. domain permission_denied maps to PermissionFailure', () {
      final exc = Exception('Some auth issue');
      final result = FailureMapper.map(exc, domainCode: 'permission_denied');
      expect(result, isA<PermissionFailure>());
      expect(result.code, 'permission_failure');
      expect(result.retryHint, AppRetryHint.none);
    });

    test('3. domain configuration_missing maps to ConfigurationFailure', () {
      final exc = Exception('No config');
      final result = FailureMapper.map(exc, domainCode: 'configuration_missing');
      expect(result, isA<ConfigurationFailure>());
      expect(result.code, 'configuration_failure');
      expect(result.retryHint, AppRetryHint.none);
    });

    test('4. HTTP 401 maps to AuthenticationFailure', () {
      final exc = Exception('Http code');
      final result = FailureMapper.map(exc, httpStatus: 401);
      expect(result, isA<AuthenticationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('5. HTTP 403 maps to PermissionFailure', () {
      final exc = Exception('Http code');
      final result = FailureMapper.map(exc, httpStatus: 403);
      expect(result, isA<PermissionFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('6. HTTP 409 maps to ConflictFailure', () {
      final exc = Exception('Http code');
      final result = FailureMapper.map(exc, httpStatus: 409);
      expect(result, isA<ConflictFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('7. HTTP 503 maps to ServiceUnavailableFailure', () {
      final exc = Exception('Http code');
      final result = FailureMapper.map(exc, httpStatus: 503);
      expect(result, isA<ServiceUnavailableFailure>());
      expect(result.retryHint, AppRetryHint.possible);
    });

    test('8. Postgres 23505 maps to ConflictFailure', () {
      const exc = PostgrestException(
        message: 'duplicate key value violates unique constraint users_email_key',
        code: '23505',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<ConflictFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('9. Postgres 23503 maps to ValidationFailure', () {
      const exc = PostgrestException(
        message: 'insert or update on table violates foreign key constraint',
        code: '23503',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<ValidationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('10. Postgres 23514 maps to ValidationFailure', () {
      const exc = PostgrestException(
        message: 'new row for relation violates check constraint',
        code: '23514',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<ValidationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('11. Postgres 42501 maps to PermissionFailure', () {
      const exc = PostgrestException(
        message: 'permission denied for table users',
        code: '42501',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<PermissionFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('12. Bilinen permission içerikli P0001 maps to PermissionFailure', () {
      const exc = PostgrestException(
        message: 'Access denied: Non-manager users are not allowed to update roles.',
        code: 'P0001',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<PermissionFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('13. Bilinen validation içerikli P0001 maps to ValidationFailure', () {
      const exc = PostgrestException(
        message: 'Database check failed: required email value is missing.',
        code: 'P0001',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<ValidationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('14. Bilinmeyen P0001 maps to DatabaseFailure', () {
      const exc = PostgrestException(
        message: 'Internal PL/pgSQL function stack overflow',
        code: 'P0001',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<DatabaseFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('15. SocketException maps to NetworkFailure', () {
      const exc = SocketException('No route to host');
      final result = FailureMapper.map(exc);
      expect(result, isA<NetworkFailure>());
      expect(result.retryHint, AppRetryHint.possible);
    });

    test('16. TimeoutException maps to TimeoutFailure', () {
      final exc = TimeoutException('Connection timed out');
      final result = FailureMapper.map(exc);
      expect(result, isA<TimeoutFailure>());
      expect(result.retryHint, AppRetryHint.verifyServerState);
    });

    test('17. AuthException 401 maps to AuthenticationFailure', () {
      const exc = AuthException('Invalid login credentials', statusCode: '401');
      final result = FailureMapper.map(exc);
      expect(result, isA<AuthenticationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('18. AuthException 503 maps to ServiceUnavailableFailure', () {
      const exc = AuthException('Backend maintenance', statusCode: '503');
      final result = FailureMapper.map(exc);
      expect(result, isA<ServiceUnavailableFailure>());
      expect(result.retryHint, AppRetryHint.possible);
    });

    test('19. FormatException maps to ValidationFailure', () {
      const exc = FormatException('Invalid JSON payload');
      final result = FailureMapper.map(exc);
      expect(result, isA<ValidationFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('20. Bilinen biometric PlatformException maps to DeviceSecurityFailure', () {
      final exc = PlatformException(
        code: 'NotAvailable',
        message: 'Biometric security sensor is not available on this hardware.',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<DeviceSecurityFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('21. Bilinmeyen PlatformException maps to UnknownFailure', () {
      final exc = PlatformException(
        code: 'NATIVE_GPU_CRASH',
        message: 'Unexpected rendering context failure.',
      );
      final result = FailureMapper.map(exc);
      expect(result, isA<UnknownFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('22. Bilinmeyen Exception maps to UnknownFailure', () {
      final exc = Exception('Generic test exception message');
      final result = FailureMapper.map(exc);
      expect(result, isA<UnknownFailure>());
      expect(result.retryHint, AppRetryHint.none);
    });

    test('23. Ham teknik mesaj userMessage içine sızmıyor', () {
      const exc = PostgrestException(
        message: 'duplicate key value violates unique constraint users_email_key on table public.users',
        code: '23505',
      );
      final result = FailureMapper.map(exc);
      // userMessage should be the default safe Turkish one, not leakage.
      expect(result.userMessage, isNot(contains('users_email_key')));
      expect(result.userMessage, isNot(contains('public.users')));
      expect(result.userMessage, isNot(contains('23505')));
      expect(result.userMessage, 'Bu işlem mevcut bir kayıtla çakışıyor.');
    });

    test('24. cause ve stackTrace korunuyor', () {
      const exc = SocketException('Network down');
      final result = FailureMapper.map(exc, stackTrace: testStackTrace);
      expect(result.cause, same(exc));
      expect(result.stackTrace, same(testStackTrace));
    });

    test('25. retryHint doğru teknik ipucunu taşıyor', () {
      final netResult = FailureMapper.map(const SocketException('Network error'));
      expect(netResult.retryHint, AppRetryHint.possible);

      final timeoutResult = FailureMapper.map(TimeoutException('Timeout occurred'));
      expect(timeoutResult.retryHint, AppRetryHint.verifyServerState);

      final permResult = FailureMapper.map(Exception('Denied'), domainCode: 'permission_denied');
      expect(permResult.retryHint, AppRetryHint.none);
    });
  });
}
