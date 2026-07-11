import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/core/async/operation_class.dart';
import 'package:kampushub/core/async/retry_policy.dart';
import 'package:kampushub/core/async/timeout_policy.dart';
import 'package:kampushub/core/errors/app_failure.dart';

void main() {
  group('RetryContext Instantiation Tests', () {
    test('1. Geçerli context oluşturulabiliyor', () {
      final context = RetryContext(
        operationClass: OperationClass.safeRead,
        attemptCount: 2,
        maxAttempts: 3,
        hasIdempotencyProtection: true,
        canVerifyServerState: true,
      );
      expect(context.operationClass, OperationClass.safeRead);
      expect(context.attemptCount, 2);
      expect(context.maxAttempts, 3);
      expect(context.hasIdempotencyProtection, isTrue);
      expect(context.canVerifyServerState, isTrue);
    });

    test('2. attemptCount 0 reddediliyor', () {
      expect(
        () => RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 0,
          maxAttempts: 3,
        ),
        throwsArgumentError,
      );
    });

    test('3. maxAttempts 0 reddediliyor', () {
      expect(
        () => RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 0,
        ),
        throwsArgumentError,
      );
    });
  });

  group('OperationClass safeRead Tests', () {
    test('4. NetworkFailure retry', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.retry);
      expect(result.delay, const Duration(milliseconds: 500));
      expect(result.reason, 'retry_safe_read');
    });

    test('5. TimeoutFailure retry', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 2,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.retry);
      expect(result.delay, const Duration(milliseconds: 1000));
    });

    test('6. ServiceUnavailableFailure retry', () {
      final result = RetryPolicy.evaluate(
        failure: const ServiceUnavailableFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.retry);
    });

    test('7. PermissionFailure retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const PermissionFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
      expect(result.reason, 'non_retryable_failure');
    });

    test('8. Deneme sınırı dolunca retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 3,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
      expect(result.reason, 'attempts_exhausted');
    });
  });

  group('OperationClass idempotentWrite Tests', () {
    test('9. Idempotency korumalı NetworkFailure retry', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          hasIdempotencyProtection: true,
        ),
      );
      expect(result.action, RetryAction.retry);
      expect(result.reason, 'retry_idempotent_write');
    });

    test('10. Idempotency korumasız NetworkFailure retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          hasIdempotencyProtection: false,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
      expect(result.reason, 'idempotency_protection_missing');
    });

    test('11. Idempotency korumalı ServiceUnavailableFailure retry', () {
      final result = RetryPolicy.evaluate(
        failure: const ServiceUnavailableFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          hasIdempotencyProtection: true,
        ),
      );
      expect(result.action, RetryAction.retry);
    });

    test('12. Timeout + server doğrulaması verifyServerState', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          canVerifyServerState: true,
        ),
      );
      expect(result.action, RetryAction.verifyServerState);
      expect(result.reason, 'verify_server_state');
    });

    test('13. Deneme sınırı dolunca retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 3,
          maxAttempts: 3,
          hasIdempotencyProtection: true,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });
  });

  group('OperationClass nonIdempotentWrite Tests', () {
    test('14. NetworkFailure otomatik retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
      expect(result.reason, 'non_idempotent_write_cannot_retry');
    });

    test('15. Timeout + doğrulama varsa verifyServerState', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          canVerifyServerState: true,
        ),
      );
      expect(result.action, RetryAction.verifyServerState);
    });

    test('16. Timeout + doğrulama yoksa doNotRetry', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          canVerifyServerState: false,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });

    test('17. ConflictFailure doNotRetry', () {
      final result = RetryPolicy.evaluate(
        failure: const ConflictFailure(),
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });
  });

  group('OperationClass securitySensitive Tests', () {
    test('18. NetworkFailure otomatik retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.securitySensitive,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });

    test('19. Timeout + doğrulama varsa verifyServerState', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.securitySensitive,
          attemptCount: 1,
          maxAttempts: 3,
          canVerifyServerState: true,
        ),
      );
      expect(result.action, RetryAction.verifyServerState);
    });

    test('20. PermissionFailure doNotRetry', () {
      final result = RetryPolicy.evaluate(
        failure: const PermissionFailure(),
        context: RetryContext(
          operationClass: OperationClass.securitySensitive,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });
  });

  group('OperationClass localDeviceOperation Tests', () {
    test('21. DeviceSecurityFailure otomatik retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const DeviceSecurityFailure(),
        context: RetryContext(
          operationClass: OperationClass.localDeviceOperation,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });

    test('22. TimeoutFailure otomatik retry değil', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.localDeviceOperation,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });
  });

  group('Retry Backoff Calculations', () {
    test('23. İlk deneme baseDelay', () {
      final delay = RetryPolicy.delayForAttempt(1);
      expect(delay, const Duration(milliseconds: 500));
    });

    test('24. İkinci deneme iki kat süre', () {
      final delay = RetryPolicy.delayForAttempt(2);
      expect(delay, const Duration(milliseconds: 1000));
    });

    test('25. Üçüncü deneme dört kat süre', () {
      final delay = RetryPolicy.delayForAttempt(3);
      expect(delay, const Duration(milliseconds: 2000));
    });

    test('26. maxDelay aşılmıyor', () {
      final delay = RetryPolicy.delayForAttempt(10, maxDelay: const Duration(seconds: 4));
      expect(delay, const Duration(seconds: 4));
    });

    test('27. Geçersiz attemptCount reddediliyor', () {
      expect(() => RetryPolicy.delayForAttempt(0), throwsArgumentError);
    });

    test('28. Geçersiz jitterFactor reddediliyor', () {
      expect(
        () => RetryPolicy.delayForAttempt(1, jitterFactor: 1.1),
        throwsArgumentError,
      );
      expect(
        () => RetryPolicy.delayForAttempt(1, jitterFactor: -0.1),
        throwsArgumentError,
      );
    });

    test('29. jitterFactor 0 deterministik sonuç veriyor', () {
      final delay = RetryPolicy.delayForAttempt(3, jitterFactor: 0.0);
      expect(delay, const Duration(milliseconds: 2000));
    });
  });

  group('TimeoutPolicy Specification Tests', () {
    test('30. Varsayılan süreler doğru', () {
      const policy = TimeoutPolicy.defaults;
      expect(policy.safeRead, const Duration(seconds: 10));
      expect(policy.idempotentWrite, const Duration(seconds: 15));
      expect(policy.nonIdempotentWrite, const Duration(seconds: 20));
      expect(policy.securitySensitive, const Duration(seconds: 10));
      expect(policy.localDeviceOperation, const Duration(seconds: 15));
    });

    test('31. Her OperationClass doğru süreyi döndürüyor', () {
      const policy = TimeoutPolicy.defaults;
      expect(policy.forOperation(OperationClass.safeRead), const Duration(seconds: 10));
      expect(policy.forOperation(OperationClass.idempotentWrite), const Duration(seconds: 15));
      expect(policy.forOperation(OperationClass.nonIdempotentWrite), const Duration(seconds: 20));
      expect(policy.forOperation(OperationClass.securitySensitive), const Duration(seconds: 10));
      expect(policy.forOperation(OperationClass.localDeviceOperation), const Duration(seconds: 15));
    });

    test('32. Özel timeout değerleri destekleniyor', () {
      final customPolicy = TimeoutPolicy(
        safeRead: const Duration(seconds: 5),
        idempotentWrite: const Duration(seconds: 5),
        nonIdempotentWrite: const Duration(seconds: 5),
        securitySensitive: const Duration(seconds: 5),
        localDeviceOperation: const Duration(seconds: 5),
      );
      expect(customPolicy.safeRead, const Duration(seconds: 5));
    });

    test('33. Sıfır veya negatif duration reddediliyor', () {
      expect(
        () => TimeoutPolicy(
          safeRead: const Duration(seconds: 0),
          idempotentWrite: const Duration(seconds: 5),
          nonIdempotentWrite: const Duration(seconds: 5),
          securitySensitive: const Duration(seconds: 5),
          localDeviceOperation: const Duration(seconds: 5),
        ),
        throwsArgumentError,
      );
      expect(
        () => TimeoutPolicy(
          safeRead: const Duration(seconds: 5),
          idempotentWrite: const Duration(seconds: -1),
          nonIdempotentWrite: const Duration(seconds: 5),
          securitySensitive: const Duration(seconds: 5),
          localDeviceOperation: const Duration(seconds: 5),
        ),
        throwsArgumentError,
      );
    });
  });

  group('Safety and Security Constraints', () {
    test('34. ValidationFailure hiçbir yazma türünde otomatik retry almıyor', () {
      final result = RetryPolicy.evaluate(
        failure: const ValidationFailure(),
        context: RetryContext(
          operationClass: OperationClass.idempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          hasIdempotencyProtection: true,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });

    test('35. UnknownFailure otomatik retry almıyor', () {
      final result = RetryPolicy.evaluate(
        failure: const UnknownFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
    });

    test('36. verifyServerState kararında delay null', () {
      final result = RetryPolicy.evaluate(
        failure: const TimeoutFailure(),
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
          canVerifyServerState: true,
        ),
      );
      expect(result.action, RetryAction.verifyServerState);
      expect(result.delay, isNull);
    });

    test('37. retry kararında delay dolu', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(),
        context: RetryContext(
          operationClass: OperationClass.safeRead,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.retry);
      expect(result.delay, isNotNull);
    });

    test('38. AppRetryHint.possible tek başına nonIdempotentWrite retry başlatmıyor', () {
      final result = RetryPolicy.evaluate(
        failure: const NetworkFailure(), // Has AppRetryHint.possible by default
        context: RetryContext(
          operationClass: OperationClass.nonIdempotentWrite,
          attemptCount: 1,
          maxAttempts: 3,
        ),
      );
      expect(result.action, RetryAction.doNotRetry);
      expect(result.reason, 'non_idempotent_write_cannot_retry');
    });
  });
}
