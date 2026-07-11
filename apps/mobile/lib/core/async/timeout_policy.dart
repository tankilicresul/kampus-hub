import 'operation_class.dart';

class TimeoutPolicy {
  final Duration safeRead;
  final Duration idempotentWrite;
  final Duration nonIdempotentWrite;
  final Duration securitySensitive;
  final Duration localDeviceOperation;

  const TimeoutPolicy._({
    required this.safeRead,
    required this.idempotentWrite,
    required this.nonIdempotentWrite,
    required this.securitySensitive,
    required this.localDeviceOperation,
  });

  factory TimeoutPolicy({
    required Duration safeRead,
    required Duration idempotentWrite,
    required Duration nonIdempotentWrite,
    required Duration securitySensitive,
    required Duration localDeviceOperation,
  }) {
    if (safeRead.inMicroseconds <= 0 ||
        idempotentWrite.inMicroseconds <= 0 ||
        nonIdempotentWrite.inMicroseconds <= 0 ||
        securitySensitive.inMicroseconds <= 0 ||
        localDeviceOperation.inMicroseconds <= 0) {
      throw ArgumentError('All timeout durations must be strictly positive');
    }
    return TimeoutPolicy._(
      safeRead: safeRead,
      idempotentWrite: idempotentWrite,
      nonIdempotentWrite: nonIdempotentWrite,
      securitySensitive: securitySensitive,
      localDeviceOperation: localDeviceOperation,
    );
  }

  static const TimeoutPolicy defaults = TimeoutPolicy._(
    safeRead: Duration(seconds: 10),
    idempotentWrite: Duration(seconds: 15),
    nonIdempotentWrite: Duration(seconds: 20),
    securitySensitive: Duration(seconds: 10),
    localDeviceOperation: Duration(seconds: 15),
  );

  Duration forOperation(OperationClass operationClass) {
    switch (operationClass) {
      case OperationClass.safeRead:
        return safeRead;
      case OperationClass.idempotentWrite:
        return idempotentWrite;
      case OperationClass.nonIdempotentWrite:
        return nonIdempotentWrite;
      case OperationClass.securitySensitive:
        return securitySensitive;
      case OperationClass.localDeviceOperation:
        return localDeviceOperation;
    }
  }
}
