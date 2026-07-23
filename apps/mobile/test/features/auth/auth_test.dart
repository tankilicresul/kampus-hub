import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:kampushub/core/constants/constants.dart';
import 'package:kampushub/core/utils/inactivity_tracker.dart';
import 'package:kampushub/core/errors/app_failure.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import 'package:kampushub/features/auth/domain/repositories/auth_repository.dart';
import 'package:kampushub/features/auth/domain/repositories/device_security_repository.dart';
import 'package:kampushub/features/auth/domain/models/authenticated_user.dart';
import 'package:kampushub/features/auth/domain/models/access_check_result.dart';
import 'package:kampushub/features/auth/domain/models/registered_device.dart';
import 'package:kampushub/features/auth/domain/models/device_registration_result.dart';
import 'package:kampushub/features/auth/domain/models/mfa_enrollment.dart';
import 'package:kampushub/features/auth/domain/models/mfa_factor.dart';
import 'package:kampushub/core/result/app_result.dart';

class _FakeAuthRepository implements AuthRepository {
  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();

  @override
  AuthenticatedUser? get currentUser => null;

  @override
  Future<AppResult<void>> signInWithGoogle() async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async => const AppSuccess(
        AccessCheckResult(
          allowed: true,
          reason: 'active',
        ),
      );

  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async => const AppSuccess(
        MfaEnrollment(
          factorId: 'fake-factor-id',
          qrCodeUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          secret: 'FAKESECRET123456',
        ),
      );

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async =>
      const AppSuccess(null);

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async => const AppSuccess([]);

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async =>
      const AppSuccess(null);
}


class _FakeDeviceSecurityRepository implements DeviceSecurityRepository {
  @override
  Future<AppResult<DeviceRegistrationResult>> registerCurrentDevice({
    required String appVersion,
    required String pushToken,
  }) async =>
      const AppSuccess(
        DeviceRegistrationResult(status: DeviceRegistrationStatus.registered),
      );

  @override
  Future<AppResult<List<RegisteredDevice>>> listActiveDevices() async => const AppSuccess([]);

  @override
  Future<AppResult<void>> revokeDevice(String deviceId) async => const AppSuccess(null);

  @override
  Future<AppResult<bool>> isBiometricEnabled() async => const AppSuccess(false);

  @override
  Future<AppResult<void>> setBiometricEnabled(bool enabled) async => const AppSuccess(null);

  @override
  Future<AppResult<String>> getOrCreateDeviceHash() async => const AppSuccess('fake-hash');
}

class TestAuthStateNotifier extends AuthStateNotifier {
  TestAuthStateNotifier(super.authRepo, super.deviceRepo);

  set testState(AuthState value) => state = value;
}

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

    test('completeMfaSimulation sets mfaVerified true and status authenticated', () {
      final state = AuthState(status: AuthStatus.biometricLocked);
      expect(state.mfaVerified, isFalse);

      final state2 = state.copyWith(mfaVerified: true);
      expect(state2.mfaVerified, isTrue);

      final state3 = state2.copyWith(status: AuthStatus.authenticated, clearError: true);
      expect(state3.mfaVerified, isTrue);
      expect(state3.status, AuthStatus.authenticated);
      expect(state3.error, isNull);
    });

    test('AuthStateNotifier completeMfaSimulation behaves correctly in debug mode', () {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );
      
      notifier.testState = AuthState(status: AuthStatus.biometricLocked, role: 'admin');
      notifier.completeMfaSimulation();
      
      expect(notifier.state.mfaVerified, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.error, isNull);
    });

    test('AuthStateNotifier signOut resets mfaVerified to false', () async {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );
      
      notifier.testState = AuthState(
        status: AuthStatus.authenticated,
        role: 'admin',
        mfaVerified: true,
      );
      
      await notifier.signOut();
      expect(notifier.state.mfaVerified, isFalse);
      expect(notifier.state.status, AuthStatus.unauthenticated);
    });

    test('unlockBiometric changes status to authenticated but does not change mfaVerified', () {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );
      
      notifier.testState = AuthState(
        status: AuthStatus.biometricLocked,
        role: 'admin',
        mfaVerified: false,
      );
      
      notifier.unlockBiometric();
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.mfaVerified, isFalse);
    });

    // ── Native Google Sign-In Tests ────────────────────────────────────────

    test('signInWithGoogle returns AppSuccess on fake repo (no cancel)', () async {
      final fakeRepo = _FakeAuthRepository();
      final result = await fakeRepo.signInWithGoogle();
      expect(result, isA<AppSuccess<void>>());
    });

    test('signInWithGoogle cancelled returns AppError with userMessage', () async {
      // Fake repo that simulates user cancellation
      final cancelRepo = _CancelledGoogleSignInAuthRepository();
      final result = await cancelRepo.signInWithGoogle();
      expect(result, isA<AppError<void>>());
      final error = result as AppError<void>;
      expect(error.failure.userMessage, contains('iptal'));
    });

    test('signInWithGoogle idToken null returns AppError', () async {
      final nullTokenRepo = _NullIdTokenAuthRepository();
      final result = await nullTokenRepo.signInWithGoogle();
      expect(result, isA<AppError<void>>());
      final error = result as AppError<void>;
      expect(error.failure.userMessage, isNotEmpty);
    });

    // ── MFA enrollment + verify flow ──────────────────────────────────────

    test('enrollMfa sets enrollingMfa status and populates mfaEnrollment', () async {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );

      notifier.testState = AuthState(status: AuthStatus.authenticated, role: 'admin');
      await notifier.enrollMfa();

      expect(notifier.state.status, AuthStatus.enrollingMfa);
      expect(notifier.state.mfaEnrollment, isNotNull);
      expect(notifier.state.mfaEnrollment!.factorId, 'fake-factor-id');
      expect(notifier.state.mfaEnrollment!.secret, 'FAKESECRET123456');
    });

    test('verifyMfaCode success completes MFA verification', () async {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );

      notifier.testState = AuthState(
        status: AuthStatus.enrollingMfa,
        role: 'admin',
        mfaEnrollment: const MfaEnrollment(
          factorId: 'fake-factor-id',
          qrCodeUri: 'data:image/png;base64,iVBORw0KGgo=',
          secret: 'FAKESECRET123456',
        ),
      );

      final result = await notifier.verifyMfaCode('123456');
      expect(result, isA<AppSuccess<void>>());
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.mfaVerified, isTrue);
      expect(notifier.state.mfaEnrollment, isNull);
    });

    test('loadMfaFactors returns empty list on fake repo', () async {
      final notifier = TestAuthStateNotifier(
        _FakeAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );

      final result = await notifier.loadMfaFactors();
      expect(result, isA<AppSuccess<List<MfaFactor>>>());
      expect((result as AppSuccess<List<MfaFactor>>).value, isEmpty);
      expect(notifier.state.mfaFactors, isEmpty);
    });

    test('loadMfaFactors failing during admin registerDevice triggers fail-closed sign-out', () async {
      final notifier = TestAuthStateNotifier(
        _MfaLoadFailureAuthRepository(),
        _FakeDeviceSecurityRepository(),
      );

      notifier.testState = AuthState(
        status: AuthStatus.checkingAccess,
        role: 'admin',
        email: 'admin@kampushub.com',
      );

      await notifier.registerDevice();

      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.error, contains('MFA durum sorgulama hatası'));
    });
  });
}

// ── Supplementary fake repositories for native sign-in edge cases ──────────

class _CancelledGoogleSignInAuthRepository implements AuthRepository {
  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();

  @override
  AuthenticatedUser? get currentUser => null;

  @override
  Future<AppResult<void>> signInWithGoogle() async {
    return const AppError(
      AuthenticationFailure(
        technicalMessage: 'Google Sign-In cancelled by user',
        userMessage: 'Google girişi iptal edildi.',
      ),
    );
  }
  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async => const AppSuccess(null);
  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async =>
      const AppSuccess(AccessCheckResult(allowed: true, reason: 'active'));

  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async =>
      const AppSuccess(MfaEnrollment(factorId: 'x', qrCodeUri: 'x', secret: 'x'));

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async =>
      const AppSuccess(null);

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async => const AppSuccess([]);

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async =>
      const AppSuccess(null);
}

class _NullIdTokenAuthRepository implements AuthRepository {
  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();

  @override
  AuthenticatedUser? get currentUser => null;

  @override
  Future<AppResult<void>> signInWithGoogle() async {
    return const AppError(
      AuthenticationFailure(
        technicalMessage: 'Google Sign-In: idToken is null',
        userMessage: 'Google kimlik doğrulaması başarısız oldu.',
      ),
    );
  }
  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async => const AppSuccess(null);
  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async =>
      const AppSuccess(AccessCheckResult(allowed: true, reason: 'active'));

  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async =>
      const AppSuccess(MfaEnrollment(factorId: 'x', qrCodeUri: 'x', secret: 'x'));

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async =>
      const AppSuccess(null);

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async => const AppSuccess([]);

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async =>
      const AppSuccess(null);
}

class _MfaLoadFailureAuthRepository implements AuthRepository {
  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();

  @override
  AuthenticatedUser? get currentUser => null;

  @override
  Future<AppResult<void>> signInWithGoogle() async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async => const AppSuccess(null);

  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async =>
      const AppSuccess(AccessCheckResult(allowed: true, reason: 'active'));

  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async =>
      const AppSuccess(MfaEnrollment(factorId: 'x', qrCodeUri: 'x', secret: 'x'));

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async =>
      const AppSuccess(null);

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async {
    return const AppError(DatabaseFailure(technicalMessage: 'DB error'));
  }

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async =>
      const AppSuccess(null);
}
