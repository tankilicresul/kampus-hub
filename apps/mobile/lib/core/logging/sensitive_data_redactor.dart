final class SensitiveDataRedactor {
  final int maxLength;

  const SensitiveDataRedactor({
    this.maxLength = 2000,
  }) : assert(maxLength > 0, 'maxLength must be strictly positive');

  static const _sensitiveKeys = {
    'password',
    'passcode',
    'pin',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'authtoken',
    'authorization',
    'cookie',
    'setcookie',
    'secret',
    'clientsecret',
    'apikey',
    'privatekey',
    'servicerole',
    'servicerolekey',
    'supabaseservicerolekey',
    'mfasecret',
    'otp',
    'onetimepassword',
    'invitationtoken',
    'rawinvitationtoken',
  };

  bool _isSensitiveKey(String key) {
    final normalized = key.toLowerCase().replaceAll(RegExp(r'[-_\s]'), '');
    return _sensitiveKeys.contains(normalized);
  }

  String sanitizeMessage(String message) {
    // 1. JWT Pattern matching: eyJ...
    message = message.replaceAllMapped(
      RegExp(r'\beyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+', caseSensitive: false),
      (match) => '[REDACTED_TOKEN]',
    );

    // 2. Bearer token in free text: Bearer abc123...
    message = message.replaceAllMapped(
      RegExp(r'\bBearer\s+([a-zA-Z0-9\-\._~\+\/]+=*)', caseSensitive: false),
      (match) => 'Bearer [REDACTED]',
    );

    // 3. Key-Value formats: password=secret, token: abc123, api_key = xyz
    final kvRegex = RegExp(
      r'''\b(password|passcode|pin|token|access[-_\s]?token|refresh[-_\s]?token|id[-_\s]?token|auth[-_\s]?token|authorization|cookie|set[-_\s]?cookie|secret|client[-_\s]?secret|api[-_\s]?key|private[-_\s]?key|service[-_\s]?role(?:[-_\s]?key)?|supabase[-_\s]?service[-_\s]?role[-_\s]?key|mfa[-_\s]?secret|otp|one[-_\s]?time[-_\s]?password|invitation[-_\s]?token|raw[-_\s]?invitation[-_\s]?token)\b\s*([:=])\s*(["\']?)((?:Bearer\s+)?[^"\'\s&?]+)(["\']?)''',
      caseSensitive: false,
    );
    message = message.replaceAllMapped(kvRegex, (match) {
      final key = match.group(1);
      final separator = match.group(2);
      final startQuote = match.group(3) ?? '';
      final endQuote = match.group(5) ?? '';
      return '$key$separator$startQuote[REDACTED]$endQuote';
    });

    // 4. URL query parameters: ?token=abc, &access_token=xyz
    final queryRegex = RegExp(
      r'([&?])(token|access[-_\s]?token|refresh[-_\s]?token|id[-_\s]?token|auth[-_\s]?token|invitation[-_\s]?token)=([^&\s]+)',
      caseSensitive: false,
    );
    message = message.replaceAllMapped(queryRegex, (match) {
      final prefix = match.group(1);
      final key = match.group(2);
      return '$prefix$key=[REDACTED]';
    });

    // 5. Emails in free text
    final emailRegex = RegExp(
      r'''\b([a-zA-Z0-9\.!#$%&'*+/=?^_{|}~-]+)@([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)\b''',
    );
    message = message.replaceAllMapped(emailRegex, (match) {
      final fullEmail = match.group(0)!;
      return maskEmail(fullEmail);
    });

    // 6. Max length truncation
    if (message.length > maxLength) {
      message = '${message.substring(0, maxLength)}...[TRUNCATED]';
    }

    return message;
  }

  Map<String, Object?> sanitizeContext(Map<String, Object?> context) {
    final Map<String, Object?> result = {};
    context.forEach((k, v) {
      result[k] = sanitizeValue(v, key: k);
    });
    return result;
  }

  Object? sanitizeValue(Object? value, {String? key}) {
    if (value == null) return null;
    if (key != null && _isSensitiveKey(key)) {
      return '[REDACTED]';
    }
    if (value is num || value is bool) {
      return value;
    }
    if (value is Map) {
      final Map<String, Object?> result = {};
      value.forEach((k, v) {
        final keyStr = k.toString();
        result[keyStr] = sanitizeValue(v, key: keyStr);
      });
      return result;
    }
    if (value is List) {
      return value.map((e) => sanitizeValue(e, key: key)).toList();
    }
    if (value is Set) {
      return value.map((e) => sanitizeValue(e, key: key)).toSet();
    }
    if (value is Iterable) {
      return value.map((e) => sanitizeValue(e, key: key)).toList();
    }
    if (value is String) {
      return sanitizeMessage(value);
    }
    // Custom object: sanitize its toString output
    return sanitizeMessage(value.toString());
  }

  String maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2 || parts[0].isEmpty) {
      return '***';
    }
    final local = parts[0];
    final domain = parts[1];
    if (local.length <= 1) {
      return '*@$domain';
    }
    return '${local[0]}***@$domain';
  }
}
