import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/core/logging/sensitive_data_redactor.dart';
import 'package:kampushub/core/logging/app_logger.dart';

class FakeAppLogSink implements AppLogSink {
  final List<AppLogRecord> records = [];

  @override
  Future<void> write(AppLogRecord record) async {
    records.add(record);
  }
}

class ThrowingAppLogSink implements AppLogSink {
  final bool throwSynchronously;

  ThrowingAppLogSink({this.throwSynchronously = false});

  @override
  Future<void> write(AppLogRecord record) {
    if (throwSynchronously) {
      throw Exception('Synchronous write error');
    }
    return Future.error(Exception('Asynchronous write error'));
  }
}

void main() {
  group('SensitiveDataRedactor Tests', () {
    const redactor = SensitiveDataRedactor(maxLength: 100);

    test('1. password key-value sanitization', () {
      expect(redactor.sanitizeMessage('password=my_secret_pass'), 'password=[REDACTED]');
    });

    test('2. passcode key-value sanitization', () {
      expect(redactor.sanitizeMessage('passcode:1234'), 'passcode:[REDACTED]');
    });

    test('3. pin key-value sanitization', () {
      expect(redactor.sanitizeMessage('pin = "9999"'), 'pin="[REDACTED]"');
    });

    test('4. token key-value sanitization', () {
      expect(redactor.sanitizeMessage('token: abc'), 'token:[REDACTED]');
    });

    test('5. access_token key-value sanitization', () {
      expect(redactor.sanitizeMessage('access_token=xyz'), 'access_token=[REDACTED]');
    });

    test('6. refresh_token key-value sanitization', () {
      expect(redactor.sanitizeMessage('refresh-token: 123'), 'refresh-token:[REDACTED]');
    });

    test('7. id_token key-value sanitization', () {
      expect(redactor.sanitizeMessage('id_token=val'), 'id_token=[REDACTED]');
    });

    test('8. authorization key-value sanitization', () {
      expect(redactor.sanitizeMessage('authorization: Bearer xyz'), 'authorization:[REDACTED]');
    });

    test('9. Bearer token inside free text sanitization', () {
      expect(redactor.sanitizeMessage('Request has Bearer abc-123_xyz token'), 'Request has Bearer [REDACTED] token');
    });

    test('10. cookie key-value sanitization', () {
      expect(redactor.sanitizeMessage('cookie: sessid=123'), 'cookie:[REDACTED]');
    });

    test('11. set-cookie key-value sanitization', () {
      expect(redactor.sanitizeMessage('set-cookie: auth=xyz'), 'set-cookie:[REDACTED]');
    });

    test('12. secret key-value sanitization', () {
      expect(redactor.sanitizeMessage('secret=topsecret'), 'secret=[REDACTED]');
    });

    test('13. client_secret key-value sanitization', () {
      expect(redactor.sanitizeMessage('client_secret=123'), 'client_secret=[REDACTED]');
    });

    test('14. api_key key-value sanitization', () {
      expect(redactor.sanitizeMessage('api-key: some_key'), 'api-key:[REDACTED]');
    });

    test('15. private_key key-value sanitization', () {
      expect(redactor.sanitizeMessage('private_key=key_val'), 'private_key=[REDACTED]');
    });

    test('16. service_role key-value sanitization', () {
      expect(redactor.sanitizeMessage('service_role=role_val'), 'service_role=[REDACTED]');
    });

    test('17. supabase_service_role_key key-value sanitization', () {
      expect(redactor.sanitizeMessage('supabase-service-role-key: sb_key'), 'supabase-service-role-key:[REDACTED]');
    });

    test('18. mfa_secret key-value sanitization', () {
      expect(redactor.sanitizeMessage('mfa-secret=secret_val'), 'mfa-secret=[REDACTED]');
    });

    test('19. otp key-value sanitization', () {
      expect(redactor.sanitizeMessage('otp=987654'), 'otp=[REDACTED]');
    });

    test('20. one-time password key-value sanitization', () {
      expect(redactor.sanitizeMessage('one-time-password: pw'), 'one-time-password:[REDACTED]');
    });

    test('21. invitation_token key-value sanitization', () {
      expect(redactor.sanitizeMessage('invitation_token=abc'), 'invitation_token=[REDACTED]');
    });

    test('22. raw_invitation_token key-value sanitization', () {
      expect(redactor.sanitizeMessage('raw-invitation-token: xyz'), 'raw-invitation-token:[REDACTED]');
    });

    test('23. JWT token maskeleme', () {
      expect(redactor.sanitizeMessage('JWT is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c in raw format'), 'JWT is [REDACTED_TOKEN] in raw format');
    });

    test('24. URL query parametre maskeleme with question mark', () {
      expect(redactor.sanitizeMessage('https://example.com/callback?token=secret123&other=param'), 'https://example.com/callback?token=[REDACTED]&other=param');
    });

    test('25. URL query parametre maskeleme with ampersand', () {
      expect(redactor.sanitizeMessage('https://example.com/callback?other=param&access_token=secret456'), 'https://example.com/callback?other=param&access_token=[REDACTED]');
    });

    test('26. E-posta maskeleme standard', () {
      expect(redactor.sanitizeMessage('Contact support@example.com today'), 'Contact s***@example.com today');
    });

    test('27. E-posta maskeleme kisa kullanici adi (a@example.com)', () {
      expect(redactor.sanitizeMessage('User a@example.com logged in'), 'User *@example.com logged in');
    });

    test('28. E-posta maskeleme iki karakterli kullanici adi (ab@example.com)', () {
      expect(redactor.sanitizeMessage('User ab@example.com logged in'), 'User a***@example.com logged in');
    });

    test('29. Hassas olmayan metnin korunmasi', () {
      const normalText = 'This is a normal log message with no secrets.';
      expect(redactor.sanitizeMessage(normalText), normalText);
    });

    test('30. Mesaj maksimum uzunluk siniri', () {
      final longText = 'A' * 150;
      final expected = '${'A' * 100}...[TRUNCATED]';
      expect(redactor.sanitizeMessage(longText), expected);
    });

    test('31. Orijinal context haritasinin degistirilmemesi', () {
      final context = {
        'id': 123,
        'token': 'secret_token',
      };
      final sanitized = redactor.sanitizeContext(context);
      expect(sanitized['token'], '[REDACTED]');
      expect(context['token'], 'secret_token'); // Original map unchanged
    });

    test('32. Hassas anahtarlarin buyuk/kucuk harf varyasyonlari', () {
      expect(redactor.sanitizeMessage('PASSWORD=123'), 'PASSWORD=[REDACTED]');
      expect(redactor.sanitizeMessage('Auth-Token: xyz'), 'Auth-Token:[REDACTED]');
    });

    test('33. Ic ice Map temizleme', () {
      final context = {
        'user': {
          'name': 'John',
          'password': 'my-password',
        }
      };
      final sanitized = redactor.sanitizeValue(context) as Map;
      expect((sanitized['user'] as Map)['password'], '[REDACTED]');
      expect((sanitized['user'] as Map)['name'], 'John');
    });

    test('34. List temizleme', () {
      final list = ['normal', 'password=123'];
      final sanitized = redactor.sanitizeValue(list) as List;
      expect(sanitized[0], 'normal');
      expect(sanitized[1], 'password=[REDACTED]');
    });

    test('35. Set ve Iterable temizleme', () {
      final set = {'normal', 'password=123'};
      final sanitized = redactor.sanitizeValue(set) as Set;
      expect(sanitized.contains('normal'), true);
      expect(sanitized.contains('password=[REDACTED]'), true);
    });

    test('36. Null, sayi ve boolean degerlerin korunmasi', () {
      expect(redactor.sanitizeValue(null), null);
      expect(redactor.sanitizeValue(123), 123);
      expect(redactor.sanitizeValue(true), true);
    });
  });

  group('SafeAppLogger Tests', () {
    test('37. Beş log seviyesinin dogru kaydedilmesi - debug', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.debug('test');
      expect(sink.records.length, 1);
      expect(sink.records[0].level, AppLogLevel.debug);
    });

    test('38. Beş log seviyesinin dogru kaydedilmesi - info', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.info('test');
      expect(sink.records.length, 1);
      expect(sink.records[0].level, AppLogLevel.info);
    });

    test('39. Beş log seviyesinin dogru kaydedilmesi - warning', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.warning('test');
      expect(sink.records.length, 1);
      expect(sink.records[0].level, AppLogLevel.warning);
    });

    test('40. Beş log seviyesinin dogru kaydedilmesi - error', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.error('test');
      expect(sink.records.length, 1);
      expect(sink.records[0].level, AppLogLevel.error);
    });

    test('41. Beş log seviyesinin dogru kaydedilmesi - critical', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.critical('test');
      expect(sink.records.length, 1);
      expect(sink.records[0].level, AppLogLevel.critical);
    });

    test('42. Timestamp olusturulmasi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      final before = DateTime.now().subtract(const Duration(seconds: 1));
      logger.info('test');
      final record = sink.records[0];
      expect(record.timestamp.isAfter(before), true);
      expect(record.timestamp.isBefore(DateTime.now().add(const Duration(seconds: 1))), true);
    });

    test('43. Mesajin temizlenmesi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.info('message password=xyz');
      expect(sink.records[0].message, 'message password=[REDACTED]');
    });

    test('44. Contextin recursive temizlenmesi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.info('test', context: {
        'key': 'normal',
        'sub': {
          'token': 'my_token',
        }
      });
      final recContext = sink.records[0].context;
      expect(recContext['key'], 'normal');
      expect((recContext['sub'] as Map)['token'], '[REDACTED]');
    });

    test('45. Development ortaminda teknik ayrinti eklenmesi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.error('test', error: 'DbError', stackTrace: StackTrace.fromString('stack_line'));
      final details = sink.records[0].technicalDetails;
      expect(details, contains('DbError'));
      expect(details, contains('stack_line'));
    });

    test('46. Development teknik ayrintilarinin redactordan gecirilmesi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.error('test', error: 'DbError password=xyz');
      final details = sink.records[0].technicalDetails;
      expect(details, contains('DbError password=[REDACTED]'));
    });

    test('47. Production ortaminda technicalDetails alaninin null olmasi', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.production);
      logger.error('test', error: 'DbError', stackTrace: StackTrace.fromString('stack_line'));
      expect(sink.records[0].technicalDetails, null);
    });

    test('48. Error olmadan loglama', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.info('test', stackTrace: StackTrace.fromString('stack_line'));
      expect(sink.records[0].technicalDetails, contains('StackTrace:\nstack_line'));
      expect(sink.records[0].technicalDetails, notContains('Error:'));
    });

    test('49. StackTrace olmadan loglama', () {
      final sink = FakeAppLogSink();
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);
      logger.info('test', error: 'SomeError');
      expect(sink.records[0].technicalDetails, contains('Error: SomeError'));
      expect(sink.records[0].technicalDetails, notContains('StackTrace:'));
    });

    test('50. sink.write async hata verdiginde hatanin disari cikmamasi', () async {
      final sink = ThrowingAppLogSink(throwSynchronously: false);
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);

      expect(() => logger.info('test'), returnsNormally);
      // Let the microtask queue run to ensure catchError handles it
      await Future<void>.delayed(Duration.zero);
    });

    test('51. sink.write senkron hata verdiginde hatanin disari cikmamasi', () async {
      final sink = ThrowingAppLogSink(throwSynchronously: true);
      final logger = SafeAppLogger(sink: sink, environment: AppLogEnvironment.development);

      expect(() => logger.info('test'), returnsNormally);
    });

    test('52. NoopAppLogger metotlarinin hata vermeden tamamlanmasi', () {
      const logger = NoopAppLogger();
      expect(() => logger.debug('test'), returnsNormally);
      expect(() => logger.info('test'), returnsNormally);
      expect(() => logger.warning('test'), returnsNormally);
      expect(() => logger.error('test'), returnsNormally);
      expect(() => logger.critical('test'), returnsNormally);
    });
  });
}

// Custom matcher to check that a string does not contain a substring
Matcher notContains(String substring) => isNot(contains(substring));
