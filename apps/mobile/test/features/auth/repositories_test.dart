import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kapindahub/core/constants/constants.dart';
import 'package:kapindahub/core/logging/app_logger.dart';
import 'package:kapindahub/core/errors/app_failure.dart';
import 'package:kapindahub/core/async/operation_class.dart';
import 'package:kapindahub/core/async/retry_policy.dart';
import 'package:kapindahub/features/auth/domain/models/authenticated_user.dart';
import 'package:kapindahub/features/auth/domain/models/registered_device.dart';
import 'package:kapindahub/features/auth/domain/models/device_registration_result.dart';
import 'package:kapindahub/features/auth/data/repositories/supabase_auth_repository.dart';
import 'package:kapindahub/features/auth/data/repositories/supabase_device_security_repository.dart';

class FakePostgrestFilterBuilder<T> implements PostgrestFilterBuilder<T> {
  final Future<T> _future;

  FakePostgrestFilterBuilder(this._future);

  @override
  Future<R> then<R>(FutureOr<R> Function(T value) onValue, {Function? onError}) {
    return _future.then(onValue, onError: onError);
  }

  @override
  Future<T> catchError(Function onError, {bool Function(Object error)? test}) {
    return _future.catchError(onError, test: test);
  }

  @override
  Future<T> whenComplete(FutureOr<void> Function() action) {
    return _future.whenComplete(action);
  }

  @override
  Stream<T> asStream() {
    return _future.asStream();
  }

  @override
  Future<T> timeout(Duration timeLimit, {FutureOr<T> Function()? onTimeout}) {
    return _future.timeout(timeLimit, onTimeout: onTimeout);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ── Fake Google Sign-In infrastructure ───────────────────────────────────────

/// Controllable fake implementation of [GoogleSignIn].
/// Overrides [signIn] so no platform channel is invoked in tests.
class FakeGoogleSignIn extends GoogleSignIn {
  /// Return value for the next [signIn] call. Set to null to simulate cancel.
  GoogleSignInAccount? mockAccount;
  /// If non-null, [signIn] throws this instead of returning [mockAccount].
  Exception? throwException;

  @override
  Future<GoogleSignInAccount?> signIn() async {
    if (throwException != null) throw throwException!;
    return mockAccount;
  }
}

/// Fake [GoogleSignInAccount] with configurable idToken and accessToken.
class FakeGoogleSignInAccount implements GoogleSignInAccount {
  // ignore: prefer_initializing_formals
  final String? _idToken;
  // ignore: prefer_initializing_formals
  final String? _accessToken;

  FakeGoogleSignInAccount({String? idToken, String? accessToken})
      : _idToken = idToken, // ignore: prefer_initializing_formals
        _accessToken = accessToken; // ignore: prefer_initializing_formals

  @override
  Future<GoogleSignInAuthentication> get authentication async =>
      _FakeGoogleSignInAuth(idToken: _idToken, accessToken: _accessToken);

  @override
  String get displayName => 'Test User';
  @override
  String get email => 'test@example.com';
  @override
  String get id => 'fake-google-uid';
  @override
  String? get photoUrl => null;
  @override
  String? get serverAuthCode => null;
  @override
  Future<Map<String, String>> get authHeaders async => {};
  @override
  Future<void> clearAuthCache() async {}
  Future<bool> requestScopes(List<String> scopes) async => true;
}

class _FakeGoogleSignInAuth implements GoogleSignInAuthentication {
  @override
  final String? idToken;
  @override
  final String? accessToken;
  @override
  String? get serverAuthCode => null;

  const _FakeGoogleSignInAuth({this.idToken, this.accessToken});
}

class FakeOAuthResponse implements OAuthResponse {
  @override
  final String url;
  @override
  final OAuthProvider provider;

  const FakeOAuthResponse({required this.url, this.provider = OAuthProvider.google});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeGoTrueClient implements GoTrueClient {
  final StreamController<AuthState> _authStateController = StreamController<AuthState>.broadcast();
  User? _mockCurrentUser;
  Future<bool> Function(OAuthProvider provider, String? redirectTo)? onSignInWithOAuth;
  Future<void> Function()? onSignOut;
  Future<OAuthResponse> Function(OAuthProvider provider, String? redirectTo)? onGetOAuthSignInUrl;
  /// Called when signInWithIdToken is invoked — captures provider/tokens.
  // ignore: experimental_member_use
  Future<AuthResponse> Function(OAuthProvider provider, String idToken, String? accessToken)? onSignInWithIdToken;
  /// Tokens captured from the most recent signInWithIdToken call.
  String? capturedIdToken;
  String? capturedAccessToken;

  @override
  Stream<AuthState> get onAuthStateChange => _authStateController.stream;

  @override
  User? get currentUser => _mockCurrentUser;

  void emitAuthState(AuthState state) {
    _authStateController.add(state);
  }

  void close() {
    _authStateController.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #getOAuthSignInUrl) {
      final provider = invocation.namedArguments[#provider] as OAuthProvider?;
      final redirectTo = invocation.namedArguments[#redirectTo] as String?;
      if (onGetOAuthSignInUrl != null) {
        return onGetOAuthSignInUrl!(provider ?? OAuthProvider.google, redirectTo);
      }
      if (onSignInWithOAuth != null) {
        onSignInWithOAuth!(provider ?? OAuthProvider.google, redirectTo);
      }
      return Future.value(const FakeOAuthResponse(url: 'https://mock-oauth-url.com'));
    }
    if (invocation.memberName == #signInWithIdToken) {
      final provider = invocation.namedArguments[#provider] as OAuthProvider?;
      final idToken = invocation.namedArguments[#idToken] as String?;
      final accessToken = invocation.namedArguments[#accessToken] as String?;
      capturedIdToken = idToken;
      capturedAccessToken = accessToken;
      if (onSignInWithIdToken != null) {
        return onSignInWithIdToken!(
          provider ?? OAuthProvider.google,
          idToken ?? '',
          accessToken,
        );
      }
      // Default: return a minimal AuthResponse success
      return Future<AuthResponse>.value(AuthResponse());
    }
    if (invocation.memberName == #signOut) {
      if (onSignOut != null) {
        return onSignOut!();
      }
      return Future.value();
    }
    return super.noSuchMethod(invocation);
  }
}

class FakeUser implements User {
  @override
  final String id;
  @override
  final String? email;

  const FakeUser({required this.id, this.email});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeSession implements Session {
  @override
  final User user;

  const FakeSession({required this.user});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeAuthState implements AuthState {
  @override
  final Session? session;
  @override
  final AuthChangeEvent event;

  const FakeAuthState({this.session, required this.event});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeSupabaseClient implements SupabaseClient {
  @override
  final FakeGoTrueClient auth;
  
  Future<dynamic> Function(String fn, Map<String, dynamic>? params)? onRpc;

  FakeSupabaseClient(this.auth);

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #rpc) {
      final fn = invocation.positionalArguments[0] as String;
      final params = invocation.namedArguments[#params] as Map<String, dynamic>?;
      final Future<dynamic> future = onRpc != null
          ? onRpc!(fn, params)
          : Future.value(null);
      return FakePostgrestFilterBuilder(future);
    }
    return super.noSuchMethod(invocation);
  }
}

class FakeAppLogger implements AppLogger {
  final List<String> logs = [];

  @override
  void debug(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('DEBUG: $message');
  }

  @override
  void info(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('INFO: $message');
  }

  @override
  void warning(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('WARNING: $message');
  }

  @override
  void error(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('ERROR: $message');
  }

  @override
  void critical(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('CRITICAL: $message');
  }
}

class FakeFlutterSecureStorage implements FlutterSecureStorage {
  final Map<String, String> _data = {};
  
  bool shouldThrowRead = false;
  bool shouldThrowWrite = false;

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #read) {
      final key = invocation.namedArguments[#key] as String;
      if (shouldThrowRead) {
        throw const SocketException('Storage read error');
      }
      return Future.value(_data[key]);
    }
    if (invocation.memberName == #write) {
      final key = invocation.namedArguments[#key] as String;
      final value = invocation.namedArguments[#value] as String;
      if (shouldThrowWrite) {
        throw const SocketException('Storage write error');
      }
      _data[key] = value;
      return Future.value();
    }
    return super.noSuchMethod(invocation);
  }
}

class FakeDeviceInfoPlugin implements DeviceInfoPlugin {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('SupabaseAuthRepository Unit Tests', () {
    test('onAuthStateChanged maps Supabase auth events correctly', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final repo = SupabaseAuthRepository(client);

      final events = <AuthenticatedUser?>[];
      final subscription = repo.onAuthStateChanged.listen(events.add);

      // 1. Emit null session
      fakeAuth.emitAuthState(const FakeAuthState(session: null, event: AuthChangeEvent.signedOut));
      await Future<void>.delayed(Duration.zero);
      expect(events.last, isNull);

      // 2. Emit active user
      const user = FakeUser(id: 'uuid-1', email: 'test@example.com');
      const session = FakeSession(user: user);
      fakeAuth.emitAuthState(const FakeAuthState(session: session, event: AuthChangeEvent.signedIn));
      await Future<void>.delayed(Duration.zero);
      expect(events.last, isNotNull);
      expect(events.last!.id, 'uuid-1');
      expect(events.last!.email, 'test@example.com');

      // 3. Emit user with null email
      const userNullEmail = FakeUser(id: 'uuid-2', email: null);
      const sessionNull = FakeSession(user: userNullEmail);
      fakeAuth.emitAuthState(const FakeAuthState(session: sessionNull, event: AuthChangeEvent.signedIn));
      await Future<void>.delayed(Duration.zero);
      expect(events.last!.id, 'uuid-2');
      expect(events.last!.email, '');

      await subscription.cancel();
      fakeAuth.close();
    });

    test('currentUser maps the active session user correctly', () {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final repo = SupabaseAuthRepository(client);

      // 1. No user
      fakeAuth._mockCurrentUser = null;
      expect(repo.currentUser, isNull);

      // 2. User exists
      fakeAuth._mockCurrentUser = const FakeUser(id: 'uuid-1', email: 'test@example.com');
      expect(repo.currentUser, isNotNull);
      expect(repo.currentUser!.id, 'uuid-1');
      expect(repo.currentUser!.email, 'test@example.com');

      // 3. User email null
      fakeAuth._mockCurrentUser = const FakeUser(id: 'uuid-2', email: null);
      expect(repo.currentUser!.id, 'uuid-2');
      expect(repo.currentUser!.email, '');
    });

    test('signInWithGoogle handles native sign-in: success, cancel, null token, exception', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final logger = FakeAppLogger();
      final fakeGoogleSignIn = FakeGoogleSignIn();
      final repo = SupabaseAuthRepository(client, logger: logger, googleSignIn: fakeGoogleSignIn);

      // 1. Success: returns account with valid idToken
      fakeGoogleSignIn.mockAccount = FakeGoogleSignInAccount(
        idToken: 'valid-id-token',
        accessToken: 'valid-access-token',
      );
      final result1 = await repo.signInWithGoogle();
      expect(result1.isSuccess, isTrue);
      expect(fakeAuth.capturedIdToken, 'valid-id-token');
      expect(fakeAuth.capturedAccessToken, 'valid-access-token');

      // 2. Cancel: user dismisses the picker (signIn returns null)
      fakeGoogleSignIn.mockAccount = null;
      fakeGoogleSignIn.throwException = null;
      final result2 = await repo.signInWithGoogle();
      expect(result2.isError, isTrue);
      expect(result2.failureOrNull, isA<AuthenticationFailure>());
      expect(result2.failureOrNull!.userMessage, contains('iptal'));

      // 3. Null idToken: account returned but idToken is missing
      fakeGoogleSignIn.mockAccount = FakeGoogleSignInAccount(idToken: null, accessToken: null);
      final result3 = await repo.signInWithGoogle();
      expect(result3.isError, isTrue);
      expect(result3.failureOrNull, isA<AuthenticationFailure>());

      // 4. Exception: GoogleSignIn throws during sign-in attempt
      fakeGoogleSignIn.throwException = Exception('Network unavailable');
      final result4 = await repo.signInWithGoogle();
      expect(result4.isError, isTrue);
      expect(result4.failureOrNull, isNotNull);
    });

    test('checkCurrentUserAccess maps RPC responses correctly', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final repo = SupabaseAuthRepository(client);

      // 1. Success mapping
      client.onRpc = (fn, params) async {
        expect(fn, 'check_current_user_access');
        return {
          'allowed': true,
          'reason': 'active',
          'role': 'admin',
          'university_id': 'uni-123',
          'expires_at': '2026-07-12T00:00:00Z',
        };
      };

      final result1 = await repo.checkCurrentUserAccess();
      expect(result1.isSuccess, isTrue);
      final access = result1.valueOrNull!;
      expect(access.allowed, isTrue);
      expect(access.reason, 'active');
      expect(access.role, 'admin');
      expect(access.universityId, 'uni-123');

      // 2. Missing allowed
      client.onRpc = (fn, params) async => {'reason': 'active'};
      final result2 = await repo.checkCurrentUserAccess();
      expect(result2.isError, isTrue);
      expect(result2.failureOrNull, isA<ValidationFailure>());

      // 3. Missing reason
      client.onRpc = (fn, params) async => {'allowed': true};
      final result3 = await repo.checkCurrentUserAccess();
      expect(result3.isError, isTrue);
      expect(result3.failureOrNull, isA<ValidationFailure>());

      // 4. Invalid allowed type
      client.onRpc = (fn, params) async => {'allowed': 'true', 'reason': 'active'};
      final result4 = await repo.checkCurrentUserAccess();
      expect(result4.isError, isTrue);
      expect(result4.failureOrNull, isA<ValidationFailure>());

      // 5. Exception
      client.onRpc = (fn, params) async => throw const PostgrestException(message: 'Database connection failed');
      final result5 = await repo.checkCurrentUserAccess();
      expect(result5.isError, isTrue);
      expect(result5.failureOrNull, isA<DatabaseFailure>());
    });

    test('checkCurrentUserAccess retries transient failures up to max attempts', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final logger = FakeAppLogger();
      final repo = SupabaseAuthRepository(client, logger: logger);

      int rpcCallCount = 0;
      client.onRpc = (fn, params) async {
        rpcCallCount++;
        throw const SocketException('Connection timeout');
      };

      final result = await repo.checkCurrentUserAccess();
      expect(result.isError, isTrue);

      final expectedMaxAttempts = RetryPolicy.maxAttemptsFor(OperationClass.safeRead);
      expect(rpcCallCount, expectedMaxAttempts);
      expect(result.failureOrNull, isA<NetworkFailure>());
    });

    test('signOut handles success and failure', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final repo = SupabaseAuthRepository(client);

      // 1. Success signOut
      fakeAuth.onSignOut = () async {};
      final result1 = await repo.signOut();
      expect(result1.isSuccess, isTrue);

      // 2. Failure signOut
      fakeAuth.onSignOut = () async => throw const AuthException('Sign out failed');
      final result2 = await repo.signOut();
      expect(result2.isError, isTrue);
      expect(result2.failureOrNull, isA<AuthenticationFailure>());
    });
  });

  group('SupabaseDeviceSecurityRepository Unit Tests', () {
    test('getOrCreateDeviceHash generates, saves, and reuses device hash correctly', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      // 1. Initial generation
      final result1 = await repo.getOrCreateDeviceHash();
      expect(result1.isSuccess, isTrue);
      final hash1 = result1.valueOrNull!;
      expect(hash1.length, 64); // SHA-256 hex is 64 characters

      final savedUuid = storage._data[AppConstants.keyRegisteredDeviceHash];
      expect(savedUuid, isNotNull);
      expect(savedUuid!.length, 36); // UUID v4 is 36 characters

      // 2. Re-use
      final result2 = await repo.getOrCreateDeviceHash();
      expect(result2.isSuccess, isTrue);
      expect(result2.valueOrNull!, hash1);

      // 3. Pre-known UUID
      const testUuid = '12345678-1234-1234-1234-123456781234';
      storage._data[AppConstants.keyRegisteredDeviceHash] = testUuid;
      final expectedHash = sha256.convert(utf8.encode(testUuid)).toString();

      final result3 = await repo.getOrCreateDeviceHash();
      expect(result3.isSuccess, isTrue);
      expect(result3.valueOrNull!, expectedHash);

      // 4. Storage read error
      storage.shouldThrowRead = true;
      final result4 = await repo.getOrCreateDeviceHash();
      expect(result4.isError, isTrue);
      storage.shouldThrowRead = false;

      // 5. Storage write error (clear key first to force write)
      storage._data.remove(AppConstants.keyRegisteredDeviceHash);
      storage.shouldThrowWrite = true;
      final result5 = await repo.getOrCreateDeviceHash();
      expect(result5.isError, isTrue);
      storage.shouldThrowWrite = false;
    });

    test('isBiometricEnabled parses storage values correctly', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      // 1. Value is 'true'
      storage._data[AppConstants.keyIsBiometricEnabled] = 'true';
      final res1 = await repo.isBiometricEnabled();
      expect(res1.valueOrNull, isTrue);

      // 2. Value is 'false'
      storage._data[AppConstants.keyIsBiometricEnabled] = 'false';
      final res2 = await repo.isBiometricEnabled();
      expect(res2.valueOrNull, isFalse);

      // 3. Value is null
      storage._data.remove(AppConstants.keyIsBiometricEnabled);
      final res3 = await repo.isBiometricEnabled();
      expect(res3.valueOrNull, isFalse);

      // 4. Different string
      storage._data[AppConstants.keyIsBiometricEnabled] = 'maybe';
      final res4 = await repo.isBiometricEnabled();
      expect(res4.valueOrNull, isFalse);

      // 5. Storage error
      storage.shouldThrowRead = true;
      final res5 = await repo.isBiometricEnabled();
      expect(res5.isError, isTrue);
    });

    test('setBiometricEnabled writes correct values and handles errors', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      // 1. Set true
      final res1 = await repo.setBiometricEnabled(true);
      expect(res1.isSuccess, isTrue);
      expect(storage._data[AppConstants.keyIsBiometricEnabled], 'true');

      // 2. Set false
      final res2 = await repo.setBiometricEnabled(false);
      expect(res2.isSuccess, isTrue);
      expect(storage._data[AppConstants.keyIsBiometricEnabled], 'false');

      // 3. Storage error
      storage.shouldThrowWrite = true;
      final res3 = await repo.setBiometricEnabled(true);
      expect(res3.isError, isTrue);
    });

    test('registerCurrentDevice handles RPC success, limit, errors and retries', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      String? capturedHash;
      String? capturedName;
      String? capturedPlatform;
      String? capturedAppVersion;
      String? capturedPushToken;

      // 1. Success case
      client.onRpc = (fn, params) async {
        expect(fn, 'register_current_device');
        capturedHash = params?['p_device_hash'] as String?;
        capturedName = params?['p_device_name'] as String?;
        capturedPlatform = params?['p_platform'] as String?;
        capturedAppVersion = params?['p_app_version'] as String?;
        capturedPushToken = params?['p_push_token'] as String?;

        return {
          'success': true,
          'device_id': 'new-device-uuid',
        };
      };

      final result1 = await repo.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'token-abc',
      );
      expect(result1.isSuccess, isTrue);
      final regResult = result1.valueOrNull!;
      expect(regResult.status, DeviceRegistrationStatus.registered);
      expect(regResult.deviceId, 'new-device-uuid');

      // Android and iOS device name branches are not tested on Windows test environment (fallback to 'Unknown Device' and 'iOS' is used).
      expect(capturedName, 'Unknown Device');
      expect(capturedPlatform, 'iOS');
      expect(capturedAppVersion, '1.0.0');
      expect(capturedPushToken, 'token-abc');
      expect(capturedHash, isNotNull);
      expect(capturedHash!.length, 64); // SHA-256 hash length

      // 2. DEVICE_LIMIT_REACHED case
      client.onRpc = (fn, params) async => {
        'success': false,
        'error': 'DEVICE_LIMIT_REACHED',
      };
      final result2 = await repo.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'token-abc',
      );
      expect(result2.isSuccess, isTrue);
      expect(result2.valueOrNull!.status, DeviceRegistrationStatus.deviceLimitReached);

      // 3. Other RPC failure
      client.onRpc = (fn, params) async => {
        'success': false,
        'error': 'SOME_DATABASE_ERROR',
      };
      final result3 = await repo.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'token-abc',
      );
      expect(result3.isError, isTrue);
      expect(result3.failureOrNull, isA<DeviceSecurityFailure>());

      // 4. Malformed RPC response (missing success field)
      client.onRpc = (fn, params) async => {
        'error': 'SOME_DATABASE_ERROR',
      };
      final result4 = await repo.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'token-abc',
      );
      expect(result4.isError, isTrue);
      expect(result4.failureOrNull, isA<ValidationFailure>());

      // 5. Retry check for idempotentWrite
      int rpcCalls = 0;
      client.onRpc = (fn, params) async {
        rpcCalls++;
        throw const SocketException('Temporary network failure');
      };

      final result5 = await repo.registerCurrentDevice(
        appVersion: '1.0.0',
        pushToken: 'token-abc',
      );
      expect(result5.isError, isTrue);
      expect(result5.failureOrNull, isA<NetworkFailure>());
      
      final expectedAttempts = RetryPolicy.maxAttemptsFor(OperationClass.idempotentWrite);
      expect(rpcCalls, expectedAttempts);
    });

    test('listActiveDevices maps valid devices, handles errors and retries', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      // 1. Success case with valid device list
      client.onRpc = (fn, params) async {
        expect(fn, 'list_current_user_devices');
        return [
          {
            'id': 'device-1',
            'device_name': 'My iPhone',
            'platform': 'iOS',
            'app_version': '1.0.0',
            'last_seen_at': '2026-07-12T02:00:00.000Z',
            'is_active': true,
          },
          {
            'id': 'device-2',
            'device_name': 'My Android',
            'platform': 'Android',
            'app_version': '1.1.0',
            'last_seen_at': '2026-07-11T12:30:00.000Z',
            'is_active': false,
          }
        ];
      };

      final result1 = await repo.listActiveDevices();
      expect(result1.isSuccess, isTrue);
      final List<RegisteredDevice> list = result1.valueOrNull!;
      expect(list.length, 2);
      
      expect(list[0].id, 'device-1');
      expect(list[0].deviceName, 'My iPhone');
      expect(list[0].platform, 'iOS');
      expect(list[0].appVersion, '1.0.0');
      expect(list[0].lastSeenAt, DateTime.parse('2026-07-12T02:00:00.000Z'));
      expect(list[0].isActive, isTrue);

      expect(list[1].id, 'device-2');
      expect(list[1].deviceName, 'My Android');
      expect(list[1].platform, 'Android');
      expect(list[1].appVersion, '1.1.0');
      expect(list[1].lastSeenAt, DateTime.parse('2026-07-11T12:30:00.000Z'));
      expect(list[1].isActive, isFalse);

      // 2. Empty list
      client.onRpc = (fn, params) async => [];
      final result2 = await repo.listActiveDevices();
      expect(result2.isSuccess, isTrue);
      expect(result2.valueOrNull!, isEmpty);

      // 3. Missing required field (id is missing)
      client.onRpc = (fn, params) async => [
        {
          'device_name': 'My iPhone',
          'platform': 'iOS',
          'app_version': '1.0.0',
          'last_seen_at': '2026-07-12T02:00:00.000Z',
          'is_active': true,
        }
      ];
      final result3 = await repo.listActiveDevices();
      expect(result3.isError, isTrue);
      expect(result3.failureOrNull, isA<ValidationFailure>());

      // 4. Wrong type (isActive is string instead of bool)
      client.onRpc = (fn, params) async => [
        {
          'id': 'device-1',
          'device_name': 'My iPhone',
          'platform': 'iOS',
          'app_version': '1.0.0',
          'last_seen_at': '2026-07-12T02:00:00.000Z',
          'is_active': 'true',
        }
      ];
      final result4 = await repo.listActiveDevices();
      expect(result4.isError, isTrue);
      expect(result4.failureOrNull, isA<ValidationFailure>());

      // 5. Invalid last_seen_at timestamp
      client.onRpc = (fn, params) async => [
        {
          'id': 'device-1',
          'device_name': 'My iPhone',
          'platform': 'iOS',
          'app_version': '1.0.0',
          'last_seen_at': 'not-a-date',
          'is_active': true,
        }
      ];
      final result5 = await repo.listActiveDevices();
      expect(result5.isError, isTrue);
      expect(result5.failureOrNull, isA<ValidationFailure>());

      // 6. Retry check for safeRead
      int rpcCalls = 0;
      client.onRpc = (fn, params) async {
        rpcCalls++;
        throw const SocketException('Transient DB connection error');
      };
      final result6 = await repo.listActiveDevices();
      expect(result6.isError, isTrue);
      expect(result6.failureOrNull, isA<NetworkFailure>());
      
      final expectedAttempts = RetryPolicy.maxAttemptsFor(OperationClass.safeRead);
      expect(rpcCalls, expectedAttempts);
    });

    test('revokeDevice handles success, failure, and retries correctly', () async {
      final fakeAuth = FakeGoTrueClient();
      final client = FakeSupabaseClient(fakeAuth);
      final storage = FakeFlutterSecureStorage();
      final deviceInfo = FakeDeviceInfoPlugin();
      final repo = SupabaseDeviceSecurityRepository(client, storage, deviceInfo);

      String? capturedDeviceId;

      // 1. Success case
      client.onRpc = (fn, params) async {
        expect(fn, 'revoke_current_user_device');
        capturedDeviceId = params?['p_device_id'] as String?;
        return {
          'success': true,
        };
      };

      final result1 = await repo.revokeDevice('device-to-remove');
      expect(result1.isSuccess, isTrue);
      expect(capturedDeviceId, 'device-to-remove');

      // 2. Failure case (success false)
      client.onRpc = (fn, params) async => {
        'success': false,
        'error': 'DEVICE_NOT_FOUND',
      };
      final result2 = await repo.revokeDevice('device-to-remove');
      expect(result2.isError, isTrue);
      expect(result2.failureOrNull, isA<DeviceSecurityFailure>());

      // 3. Malformed RPC response (missing success field)
      client.onRpc = (fn, params) async => {
        'error': 'UNEXPECTED_ERROR',
      };
      final result3 = await repo.revokeDevice('device-to-remove');
      expect(result3.isError, isTrue);
      expect(result3.failureOrNull, isA<ValidationFailure>());

      // 4. Retry check for idempotentWrite
      int rpcCalls = 0;
      client.onRpc = (fn, params) async {
        rpcCalls++;
        throw const SocketException('Transient network error');
      };
      final result4 = await repo.revokeDevice('device-to-remove');
      expect(result4.isError, isTrue);
      expect(result4.failureOrNull, isA<NetworkFailure>());
      
      final expectedAttempts = RetryPolicy.maxAttemptsFor(OperationClass.idempotentWrite);
      expect(rpcCalls, expectedAttempts);
    });
  });
}
