import '../errors/app_failure.dart';
import 'operation_class.dart';

enum RetryAction {
  doNotRetry,
  retry,
  verifyServerState,
}

class RetryContext {
  final OperationClass operationClass;
  final int attemptCount;
  final int maxAttempts;
  final bool hasIdempotencyProtection;
  final bool canVerifyServerState;

  RetryContext({
    required this.operationClass,
    required this.attemptCount,
    required this.maxAttempts,
    this.hasIdempotencyProtection = false,
    this.canVerifyServerState = false,
  }) {
    if (attemptCount < 1) {
      throw ArgumentError('attemptCount must be at least 1');
    }
    if (maxAttempts < 1) {
      throw ArgumentError('maxAttempts must be at least 1');
    }
  }
}

class RetryDecision {
  final RetryAction action;
  final Duration? delay;
  final String reason;

  const RetryDecision._({
    required this.action,
    this.delay,
    required this.reason,
  });

  factory RetryDecision.doNotRetry(String reason) {
    return RetryDecision._(
      action: RetryAction.doNotRetry,
      delay: null,
      reason: reason,
    );
  }

  factory RetryDecision.retry(Duration delay, String reason) {
    return RetryDecision._(
      action: RetryAction.retry,
      delay: delay,
      reason: reason,
    );
  }

  factory RetryDecision.verifyServerState(String reason) {
    return RetryDecision._(
      action: RetryAction.verifyServerState,
      delay: null,
      reason: reason,
    );
  }
}

abstract final class RetryPolicy {
  static RetryDecision evaluate({
    required AppFailure failure,
    required RetryContext context,
  }) {
    final isTransient = failure is NetworkFailure ||
        failure is TimeoutFailure ||
        failure is ServiceUnavailableFailure;

    // verifyServerState check for TimeoutFailure and canVerifyServerState (higher priority than maxAttempts limit)
    if (failure is TimeoutFailure && context.canVerifyServerState) {
      if (context.operationClass == OperationClass.idempotentWrite ||
          context.operationClass == OperationClass.nonIdempotentWrite ||
          context.operationClass == OperationClass.securitySensitive) {
        return RetryDecision.verifyServerState('verify_server_state');
      }
    }

    // attemptCount exhausted check
    if (context.attemptCount >= context.maxAttempts) {
      return RetryDecision.doNotRetry('attempts_exhausted');
    }

    // non-transient failures cannot be retried
    if (!isTransient) {
      return RetryDecision.doNotRetry('non_retryable_failure');
    }

    switch (context.operationClass) {
      case OperationClass.safeRead:
        return RetryDecision.retry(
          delayForAttempt(context.attemptCount),
          'retry_safe_read',
        );

      case OperationClass.idempotentWrite:
        if (context.hasIdempotencyProtection) {
          return RetryDecision.retry(
            delayForAttempt(context.attemptCount),
            'retry_idempotent_write',
          );
        }
        return RetryDecision.doNotRetry('idempotency_protection_missing');

      case OperationClass.nonIdempotentWrite:
        return RetryDecision.doNotRetry('non_idempotent_write_cannot_retry');

      case OperationClass.securitySensitive:
        return RetryDecision.doNotRetry('security_sensitive_cannot_retry');

      case OperationClass.localDeviceOperation:
        return RetryDecision.doNotRetry('local_device_operation_cannot_retry');
    }
  }

  static Duration delayForAttempt(
    int attemptCount, {
    Duration baseDelay = const Duration(milliseconds: 500),
    Duration maxDelay = const Duration(seconds: 8),
    double jitterFactor = 0.0,
  }) {
    if (attemptCount < 1) {
      throw ArgumentError('attemptCount must be at least 1');
    }
    if (jitterFactor < 0.0 || jitterFactor > 1.0) {
      throw ArgumentError('jitterFactor must be between 0 and 1');
    }

    final multiplier = 1 << (attemptCount - 1);
    var delayMs = baseDelay.inMilliseconds * multiplier;

    if (delayMs > maxDelay.inMilliseconds) {
      delayMs = maxDelay.inMilliseconds;
    }

    if (jitterFactor > 0.0) {
      // Pure deterministic pseudo-random jitter based on attemptCount
      final double pseudoRandom = ((attemptCount * 7) % 10) / 10.0;
      delayMs = (delayMs * (1.0 - jitterFactor * pseudoRandom)).toInt();
    }

    return Duration(milliseconds: delayMs);
  }
}
