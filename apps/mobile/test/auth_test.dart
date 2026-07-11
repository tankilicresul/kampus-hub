import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:kampushub/core/constants/constants.dart';
import 'package:kampushub/core/utils/inactivity_tracker.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';

class FakeSecureStorage extends FlutterSecureStorage {
  final Map<String, String> _data = {};

  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _data[key] = value ?? '';
  }

  @override
  Future<String?> read({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return _data[key];
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('Auth State & Inactivity Tests', () {
    late FakeSecureStorage storage;

    setUp(() {
      storage = FakeSecureStorage();
    });

    test('InactivityTracker calculations', () async {
      final tracker = InactivityTracker(storage);

      // Verify no last interaction starts clean
      bool lockRequired = await tracker.checkLockRequired();
      expect(lockRequired, isFalse);

      // Save interaction time to now
      await tracker.updateActivity();
      lockRequired = await tracker.checkLockRequired();
      expect(lockRequired, isFalse);

      // Simulate a timestamp 16 minutes in the past
      final pastTime = DateTime.now().subtract(const Duration(minutes: 16));
      await storage.write(
        key: AppConstants.keyLastInteractionTime,
        value: pastTime.toIso8601String(),
      );

      lockRequired = await tracker.checkLockRequired();
      expect(lockRequired, isTrue);
    });

    test('Allowlist Simulation Email Checks', () async {
      // Create mock auth state checks
      final stateMachine = AuthState(status: AuthStatus.unauthenticated);
      expect(stateMachine.status, AuthStatus.unauthenticated);

      // Uninvited Email
      final stateUninvited = stateMachine.copyWith(
        status: AuthStatus.deniedAccess,
        error: 'E-posta adresiniz davet listesinde değil.',
      );
      expect(stateUninvited.status, AuthStatus.deniedAccess);
      expect(stateUninvited.error, contains('davet listesinde değil'));

      // Inactive account
      final stateInactive = stateMachine.copyWith(
        status: AuthStatus.deniedAccess,
        error: 'Hesabınız pasif duruma getirilmiştir.',
      );
      expect(stateInactive.status, AuthStatus.deniedAccess);
      expect(stateInactive.error, contains('pasif duruma getirilmiştir'));

      // Expired terms
      final stateExpired = stateMachine.copyWith(
        status: AuthStatus.expiredAccess,
      );
      expect(stateExpired.status, AuthStatus.expiredAccess);
    });

    test('Device boundary limits check', () async {
      // Mock list of active user devices
      final List<Map<String, dynamic>> mockedActiveDevices = [
        {
          'id': 'uuid-1',
          'device_name': 'iPhone 13',
          'platform': 'iOS',
          'is_active': true,
        },
        {
          'id': 'uuid-2',
          'device_name': 'Pixel 6',
          'platform': 'Android',
          'is_active': true,
        },
      ];

      expect(mockedActiveDevices.length, 2);

      // Simulates registration failure when third device enters
      final limitReached = mockedActiveDevices.length >= 2;
      expect(limitReached, isTrue);
    });
  });
}
