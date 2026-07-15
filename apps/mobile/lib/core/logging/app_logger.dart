import 'sensitive_data_redactor.dart';

enum AppLogLevel {
  debug,
  info,
  warning,
  error,
  critical,
}

enum AppLogEnvironment {
  development,
  production,
}

final class AppLogRecord {
  final DateTime timestamp;
  final AppLogLevel level;
  final String message;
  final Map<String, Object?> context;
  final String? technicalDetails;

  const AppLogRecord({
    required this.timestamp,
    required this.level,
    required this.message,
    required this.context,
    this.technicalDetails,
  });
}

abstract interface class AppLogSink {
  Future<void> write(AppLogRecord record);
}

abstract interface class AppLogger {
  void debug(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  });

  void info(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  });

  void warning(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  });

  void error(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  });

  void critical(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  });
}

final class SafeAppLogger implements AppLogger {
  final AppLogSink sink;
  final AppLogEnvironment environment;
  final SensitiveDataRedactor redactor;

  const SafeAppLogger({
    required this.sink,
    required this.environment,
    this.redactor = const SensitiveDataRedactor(),
  });

  void _log(
    AppLogLevel level,
    String message,
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  ) {
    try {
      final sanitizedMessage = redactor.sanitizeMessage(message);
      final sanitizedContext = context != null
          ? redactor.sanitizeContext(context)
          : const <String, Object?>{};

      String? technicalDetails;
      if (environment == AppLogEnvironment.development) {
        final buffer = StringBuffer();
        if (error != null) {
          buffer.writeln('Error: $error');
        }
        if (stackTrace != null) {
          buffer.writeln('StackTrace:');
          buffer.writeln(stackTrace.toString());
        }
        if (buffer.isNotEmpty) {
          technicalDetails = redactor.sanitizeMessage(buffer.toString().trim());
        }
      }

      final record = AppLogRecord(
        timestamp: DateTime.now(),
        level: level,
        message: sanitizedMessage,
        context: sanitizedContext,
        technicalDetails: technicalDetails,
      );

      sink.write(record).catchError((Object err, StackTrace st) {
        // Handle sink exception asynchronously to prevent app crashes.
      });
    } catch (e) {
      // Prevent synchronous exceptions from interrupting the main app flow.
    }
  }

  @override
  void debug(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(AppLogLevel.debug, message, context, error, stackTrace);
  }

  @override
  void info(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(AppLogLevel.info, message, context, error, stackTrace);
  }

  @override
  void warning(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(AppLogLevel.warning, message, context, error, stackTrace);
  }

  @override
  void error(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(AppLogLevel.error, message, context, error, stackTrace);
  }

  @override
  void critical(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _log(AppLogLevel.critical, message, context, error, stackTrace);
  }
}

final class NoopAppLogger implements AppLogger {
  const NoopAppLogger();

  @override
  void debug(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {}

  @override
  void info(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {}

  @override
  void warning(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {}

  @override
  void error(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {}

  @override
  void critical(
    String message, {
    Map<String, Object?>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {}
}
