import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';
import 'package:uuid/uuid.dart';
import '../../../core/constants/constants.dart';

enum AuthStatus {
  unauthenticated,
  checkingAccess,
  waitingAccess,
  deniedAccess,
  expiredAccess,
  deviceLimitReached,
  biometricLocked,
  authenticated,
}

class AuthState {
  final AuthStatus status;
  final String? email;
  final String? role;
  final String? universityId;
  final String? error;
  final List<Map<String, dynamic>> activeDevices;

  AuthState({
    required this.status,
    this.email,
    this.role,
    this.universityId,
    this.error,
    this.activeDevices = const [],
  });

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? role,
    String? universityId,
    String? error,
    List<Map<String, dynamic>>? activeDevices,
  }) {
    return AuthState(
      status: status ?? this.status,
      email: email ?? this.email,
      role: role ?? this.role,
      universityId: universityId ?? this.universityId,
      error: error ?? this.error,
      activeDevices: activeDevices ?? this.activeDevices,
    );
  }
}

class AuthStateNotifier extends StateNotifier<AuthState> {
  final SupabaseClient _supabase;
  final FlutterSecureStorage _storage;
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  AuthStateNotifier(this._supabase, this._storage)
    : super(AuthState(status: AuthStatus.unauthenticated)) {
    // Monitor Supabase auth changes
    _supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session == null) {
        state = AuthState(status: AuthStatus.unauthenticated);
      } else {
        checkAccess(session.user);
      }
    });
  }

  /// Initiates Google Sign-In or Simulation bypass
  Future<void> signInWithGoogle({
    bool simulate = false,
    String? mockEmail,
  }) async {
    state = state.copyWith(status: AuthStatus.checkingAccess, error: null);

    if (simulate) {
      // Simulate successful auth.users trigger setup
      final targetEmail = mockEmail ?? 'operations@test.com';
      state = state.copyWith(
        status: AuthStatus.checkingAccess,
        email: targetEmail,
      );
      // Wait for mock delay
      await Future.delayed(const Duration(milliseconds: 800));

      // Run check bypass directly without calling any real RPCs
      _checkMockBypass(targetEmail);
      return;
    }

    try {
      // Execute standard Google OAuth login via Supabase SDK
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'com.kampuskapinda.kampushub://login-callback',
      );
    } catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: 'Google Sign-In Failed: ${e.toString()}',
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
      // Bypasses the registerDevice real RPC call.
      // Sets the authenticated state directly depending on the email/role.
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
  Future<void> checkAccess(User user) async {
    state = state.copyWith(
      status: AuthStatus.checkingAccess,
      email: user.email,
      error: null,
    );
    try {
      final response = await _supabase
          .rpc('check_current_user_access')
          .timeout(const Duration(seconds: 10));
      final allowed = response['allowed'] as bool;
      final reason = response['reason'] as String;

      if (!allowed) {
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
        await _supabase.auth.signOut();
        return;
      }

      state = state.copyWith(
        role: response['role'],
        universityId: response['university_id'],
      );

      // Perform device check
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
      // Get or create unique device identifier hash
      String? deviceUuid = await _storage.read(
        key: AppConstants.keyRegisteredDeviceHash,
      );
      if (deviceUuid == null) {
        deviceUuid = const Uuid().v4();
        await _storage.write(
          key: AppConstants.keyRegisteredDeviceHash,
          value: deviceUuid,
        );
      }

      // Single-way hash for security
      final hashBytes = utf8.encode(deviceUuid);
      final hash = sha256.convert(hashBytes).toString();

      // Retrieve device name & platform
      String name = 'Unknown Device';
      String platform = Platform.isAndroid ? 'Android' : 'iOS';

      if (Platform.isAndroid) {
        final info = await _deviceInfo.androidInfo;
        name = '${info.brand} ${info.model}';
      } else if (Platform.isIOS) {
        final info = await _deviceInfo.iosInfo;
        name = info.name;
      }

      final response = await _supabase.rpc(
        'register_current_device',
        params: {
          'p_device_hash': hash,
          'p_device_name': name,
          'p_platform': platform,
          'p_app_version': '1.0.0',
          'p_push_token': 'push-token-placeholder',
        },
      ).timeout(const Duration(seconds: 10));

      final success = response['success'] as bool;
      if (success) {
        // Successful device mapping. Trigger biometric lock redirect check if configured
        final isBiometricOn = await _storage.read(
          key: AppConstants.keyIsBiometricEnabled,
        );
        if (isBiometricOn == 'true') {
          state = state.copyWith(status: AuthStatus.biometricLocked);
        } else {
          state = state.copyWith(status: AuthStatus.authenticated);
        }
      } else {
        final err = response['error'] as String;
        if (err == 'DEVICE_LIMIT_REACHED') {
          await loadActiveDevices();
        } else {
          state = state.copyWith(
            status: AuthStatus.checkingAccess,
            error: 'Cihaz kaydı hatası: $err',
          );
        }
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
      final List<dynamic> response = await _supabase.rpc(
        'list_current_user_devices',
      ).timeout(const Duration(seconds: 10));
      final activeList = response
          .map((item) => Map<String, dynamic>.from(item))
          .where((item) => item['is_active'] == true)
          .toList();

      state = state.copyWith(
        status: AuthStatus.deviceLimitReached,
        activeDevices: activeList,
      );
    } catch (e) {
      state = state.copyWith(
        error: 'Aktif cihazlar listesi alınamadı: ${e.toString()}',
      );
    }
  }

  /// Revokes an existing user device to open up a seat
  Future<void> revokeDevice(String deviceId) async {
    try {
      final response = await _supabase.rpc(
        'revoke_current_user_device',
        params: {'p_device_id': deviceId},
      ).timeout(const Duration(seconds: 10));

      final success = response['success'] as bool;
      if (success) {
        // Re-try registration
        await registerDevice();
      } else {
        state = state.copyWith(
          error: 'Cihaz bağlantısı sonlandırılamadı: ${response['error']}',
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
    final user = _supabase.auth.currentUser;
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

  /// User explicitly logs out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

// Providers definition
final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(),
);
final supabaseClientProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

final authStateProvider = StateNotifierProvider<AuthStateNotifier, AuthState>((
  ref,
) {
  final supabase = ref.watch(supabaseClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthStateNotifier(supabase, storage);
});

final configMissingProvider = Provider<bool>((ref) => false);
