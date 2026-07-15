import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/features/auth/domain/models/authenticated_user.dart';
import 'package:kampushub/features/auth/domain/models/access_check_result.dart';
import 'package:kampushub/features/auth/domain/models/registered_device.dart';
import 'package:kampushub/features/auth/domain/models/device_registration_result.dart';
import 'package:kampushub/features/auth/domain/models/mfa_enrollment.dart';
import 'package:kampushub/features/auth/domain/models/mfa_factor.dart';
import 'package:kampushub/features/auth/domain/repositories/auth_repository.dart';
import 'package:kampushub/features/auth/domain/repositories/device_security_repository.dart';
import 'package:kampushub/features/auth/di/auth_dependencies.dart';

enum AuthStatus {
  unauthenticated,
  checkingAccess,
  waitingAccess,
  deniedAccess,
  expiredAccess,
  deviceLimitReached,
  biometricLocked,
  /// TOTP MFA enrollment flow is in progress (QR code screen)
  enrollingMfa,
  authenticated,
}

class AuthState {
  final AuthStatus status;
  final String? email;
  final String? role;
  final String? universityId;
  final String? error;
  final List<Map<String, dynamic>> activeDevices;
  final bool mfaVerified;
  /// Set during MFA enrollment — holds the QR code URI and secret
  final MfaEnrollment? mfaEnrollment;
  /// Cached list of MFA factors for the current user
  final List<MfaFactor> mfaFactors;

  AuthState({
    required this.status,
    this.email,
    this.role,
    this.universityId,
    this.error,
    this.activeDevices = const [],
    this.mfaVerified = false,
    this.mfaEnrollment,
    this.mfaFactors = const [],
  });

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? role,
    String? universityId,
    String? error,
    List<Map<String, dynamic>>? activeDevices,
    bool? mfaVerified,
    MfaEnrollment? mfaEnrollment,
    List<MfaFactor>? mfaFactors,
    bool clearError = false,
    bool clearMfaEnrollment = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      email: email ?? this.email,
      role: role ?? this.role,
      universityId: universityId ?? this.universityId,
      error: clearError ? null : (error ?? this.error),
      activeDevices: activeDevices ?? this.activeDevices,
      mfaVerified: mfaVerified ?? this.mfaVerified,
      mfaEnrollment: clearMfaEnrollment ? null : (mfaEnrollment ?? this.mfaEnrollment),
      mfaFactors: mfaFactors ?? this.mfaFactors,
    );
  }
}

class AuthStateNotifier extends StateNotifier<AuthState> {
  final AuthRepository authRepository;
  final DeviceSecurityRepository deviceSecurityRepository;
  late final StreamSubscription<AuthenticatedUser?> _authSubscription;

  AuthStateNotifier(this.authRepository, this.deviceSecurityRepository)
    : super(AuthState(status: AuthStatus.unauthenticated)) {
    _authSubscription = authRepository.onAuthStateChanged.listen((user) {
      if (user == null) {
        state = AuthState(status: AuthStatus.unauthenticated);
      } else {
        unawaited(checkAccess(user));
      }
    });
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    super.dispose();
  }

  /// Initiates Google Sign-In or Simulation bypass
  Future<void> signInWithGoogle({
    bool simulate = false,
    String? mockEmail,
  }) async {
    state = state.copyWith(
      status: AuthStatus.checkingAccess,
      clearError: true,
      mfaVerified: false,
    );

    if (simulate) {
      if (!kDebugMode) {
        state = AuthState(
          status: AuthStatus.unauthenticated,
          error: 'Simülasyon yalnızca geliştirme modunda kullanılabilir.',
        );
        return;
      }

      final targetEmail = mockEmail ?? 'operations@test.com';
      state = state.copyWith(
        status: AuthStatus.checkingAccess,
        email: targetEmail,
      );
      await Future.delayed(const Duration(milliseconds: 800));
      _checkMockBypass(targetEmail);
      return;
    }

    final result = await authRepository.signInWithGoogle();
    if (result is AppError<void>) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: 'Google Sign-In Failed: ${result.failure.userMessage}',
      );
    }
  }

  void _checkMockBypass(String email) {
    if (email.contains('notinvited')) {
      state = state.copyWith(
        status: AuthStatus.deniedAccess,
        error: 'E-posta adresiniz davet listesinde değil.',
      );
    } else if (email.contains('inactive')) {
      state = state.copyWith(
        status: AuthStatus.deniedAccess,
        error: 'Hesabınız pasif duruma getirilmiştir.',
      );
    } else if (email.contains('expired')) {
      state = state.copyWith(
        status: AuthStatus.expiredAccess,
        error: 'Erişim süreniz dolmuştur.',
      );
    } else {
      String role = 'staff';
      String? universityId;
      if (email == 'resultankilic.business@gmail.com') {
        role = 'admin';
      } else if (email.contains('representative')) {
        role = 'representative';
        universityId = 'mock-uni-id';
      } else if (email.contains('operations')) {
        role = 'operations';
      }

      state = state.copyWith(
        status: AuthStatus.authenticated,
        role: role,
        universityId: universityId,
        email: email,
      );
    }
  }

  /// Evaluates serverallowlist policies
  Future<void> checkAccess(AuthenticatedUser user) async {
    state = state.copyWith(
      status: AuthStatus.checkingAccess,
      email: user.email,
      clearError: true,
      mfaVerified: false,
    );
    try {
      final result = await authRepository.checkCurrentUserAccess();
      if (result is AppError<AccessCheckResult>) {
        state = state.copyWith(
          status: AuthStatus.checkingAccess,
          error: 'Erişim kontrolü başarısız: ${result.failure.userMessage}',
        );
        return;
      }

      final access = (result as AppSuccess<AccessCheckResult>).value;
      if (!access.allowed) {
        final reason = access.reason;
        if (reason == 'not_invited') {
          state = state.copyWith(
            status: AuthStatus.deniedAccess,
            error: 'E-posta adresiniz davet listesinde değil.',
          );
        } else if (reason == 'inactive') {
          state = state.copyWith(
            status: AuthStatus.deniedAccess,
            error: 'Hesabınız pasif duruma getirilmiştir.',
          );
        } else if (reason == 'expired') {
          state = state.copyWith(status: AuthStatus.expiredAccess);
        } else {
          state = state.copyWith(
            status: AuthStatus.deniedAccess,
            error: 'Giriş engellendi: $reason',
          );
        }
        await authRepository.signOut();
        return;
      }

      state = state.copyWith(
        role: access.role,
        universityId: access.universityId,
      );

      await registerDevice();
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.checkingAccess,
        error: 'Erişim kontrolü başarısız: ${e.toString()}',
      );
    }
  }

  /// Registers user device with boundary check (max 2 active devices)
  Future<void> registerDevice() async {
    try {
      final result = await deviceSecurityRepository.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'push-token-placeholder',
      );

      if (result is AppSuccess<DeviceRegistrationResult>) {
        final regResult = result.value;
        if (regResult.status == DeviceRegistrationStatus.registered) {
          final bioResult = await deviceSecurityRepository.isBiometricEnabled();
          final isBiometricOn = bioResult is AppSuccess<bool> && bioResult.value;
          if (isBiometricOn) {
            state = state.copyWith(status: AuthStatus.biometricLocked);
          } else {
            state = state.copyWith(status: AuthStatus.authenticated);
          }
        } else if (regResult.status == DeviceRegistrationStatus.deviceLimitReached) {
          await loadActiveDevices();
        }
      } else {
        final failure = (result as AppError<DeviceRegistrationResult>).failure;
        state = state.copyWith(
          status: AuthStatus.checkingAccess,
          error: 'Cihaz kaydı hatası: ${failure.userMessage}',
        );
      }
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.checkingAccess,
        error: 'Cihaz kontrolü başarısız: ${e.toString()}',
      );
    }
  }

  /// Loads current user devices list for resolution view
  Future<void> loadActiveDevices() async {
    try {
      final result = await deviceSecurityRepository.listActiveDevices();
      if (result is AppSuccess<List<RegisteredDevice>>) {
        final devices = result.value;
        final activeList = devices
            .where((d) => d.isActive)
            .map((d) => {
                  'id': d.id,
                  'device_name': d.deviceName,
                  'platform': d.platform,
                  'app_version': d.appVersion,
                  'last_seen_at': d.lastSeenAt.toIso8601String(),
                  'is_active': d.isActive,
                })
            .toList();

        state = state.copyWith(
          status: AuthStatus.deviceLimitReached,
          activeDevices: activeList,
        );
      } else {
        final failure = (result as AppError<List<RegisteredDevice>>).failure;
        state = state.copyWith(
          error: 'Aktif cihazlar listesi alınamadı: ${failure.userMessage}',
        );
      }
    } catch (e) {
      state = state.copyWith(
        error: 'Aktif cihazlar listesi alınamadı: ${e.toString()}',
      );
    }
  }

  /// Revokes an existing user device to open up a seat
  Future<void> revokeDevice(String deviceId) async {
    try {
      final result = await deviceSecurityRepository.revokeDevice(deviceId);
      if (result is AppSuccess<void>) {
        await registerDevice();
      } else {
        final failure = (result as AppError<void>).failure;
        state = state.copyWith(
          error: 'Cihaz bağlantısı sonlandırılamadı: ${failure.userMessage}',
        );
      }
    } catch (e) {
      state = state.copyWith(
        error: 'Cihaz silme işlemi başarısız: ${e.toString()}',
      );
    }
  }

  /// Retries the access checking flow for the current user session
  Future<void> retryCheckAccess() async {
    final user = authRepository.currentUser;
    if (user != null) {
      await checkAccess(user);
    } else {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.',
      );
    }
  }

  /// Bypass biometric lock
  void unlockBiometric() {
    state = state.copyWith(status: AuthStatus.authenticated);
  }

  /// Complete MFA simulation for admin (debug only)
  void completeMfaSimulation() {
    if (!kDebugMode) {
      return;
    }
    state = state.copyWith(
      status: AuthStatus.authenticated,
      mfaVerified: true,
      clearError: true,
    );
  }

  /// Marks MFA as verified after a successful real TOTP challenge+verify.
  /// Called by the MFA verify/enrollment screen after [challengeAndVerifyMfa] succeeds.
  void completeMfaVerification() {
    state = state.copyWith(
      status: AuthStatus.authenticated,
      mfaVerified: true,
      clearError: true,
      clearMfaEnrollment: true,
    );
  }

  /// Starts real TOTP enrollment. Transitions to [AuthStatus.enrollingMfa]
  /// and populates [AuthState.mfaEnrollment] with the QR URI and secret.
  Future<void> enrollMfa() async {
    state = state.copyWith(
      status: AuthStatus.enrollingMfa,
      clearError: true,
      clearMfaEnrollment: true,
    );

    final result = await authRepository.enrollMfaTotp();
    if (result is AppSuccess<MfaEnrollment>) {
      state = state.copyWith(mfaEnrollment: result.value);
    } else {
      final failure = (result as AppError<MfaEnrollment>).failure;
      state = state.copyWith(
        status: AuthStatus.authenticated,
        error: 'MFA kaydı başlatılamadı: ${failure.userMessage}',
      );
    }
  }

  /// Verifies a TOTP code submitted by the user.
  /// On success, calls [completeMfaVerification].
  Future<AppResult<void>> verifyMfaCode(String code) async {
    final result = await authRepository.challengeAndVerifyMfa(code: code);
    if (result is AppSuccess<void>) {
      completeMfaVerification();
    }
    return result;
  }

  /// Loads the list of MFA factors for the current user.
  Future<List<MfaFactor>> loadMfaFactors() async {
    final result = await authRepository.listMfaFactors();
    if (result is AppSuccess<List<MfaFactor>>) {
      state = state.copyWith(mfaFactors: result.value);
      return result.value;
    }
    return [];
  }

  /// User explicitly logs out
  Future<void> signOut() async {
    await authRepository.signOut();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

// Providers definition
final authStateProvider = StateNotifierProvider<AuthStateNotifier, AuthState>((
  ref,
) {
  final authRepo = ref.watch(authRepositoryProvider);
  final deviceRepo = ref.watch(deviceSecurityRepositoryProvider);
  return AuthStateNotifier(authRepo, deviceRepo);
});

final configMissingProvider = Provider<bool>((ref) => false);
