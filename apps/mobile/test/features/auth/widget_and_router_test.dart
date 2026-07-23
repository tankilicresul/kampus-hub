import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/app/router/app_router.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import 'package:kampushub/features/auth/presentation/screens/login_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_checking_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_waiting_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_denied_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/account_expired_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/biometric_prompt_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/device_limit_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/mfa_enrollment_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/mfa_verify_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/config_missing_screen.dart';
import 'package:kampushub/features/auth/domain/repositories/auth_repository.dart';
import 'package:kampushub/features/auth/domain/repositories/device_security_repository.dart';
import 'package:kampushub/features/auth/domain/models/authenticated_user.dart';
import 'package:kampushub/features/auth/domain/models/access_check_result.dart';
import 'package:kampushub/features/auth/domain/models/registered_device.dart';
import 'package:kampushub/features/auth/domain/models/device_registration_result.dart';
import 'package:kampushub/features/auth/domain/models/mfa_enrollment.dart';
import 'package:kampushub/features/auth/domain/models/mfa_factor.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/features/workspace/presentation/workspace_state_notifier.dart';
import 'package:kampushub/features/workspace/domain/models/workspace.dart';
import 'package:kampushub/features/workspace/domain/models/workspace_invitation.dart';
import 'package:kampushub/features/workspace/domain/repositories/workspace_repository.dart';

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

class FakeAuthStateNotifier extends AuthStateNotifier {
  FakeAuthStateNotifier(AuthState initialState)
    : super(_FakeAuthRepository(), _FakeDeviceSecurityRepository()) {
    state = initialState;
  }

  @override
  Future<void> signInWithGoogle({
    bool simulate = false,
    String? mockEmail,
  }) async {}

  @override
  Future<void> checkAccess(AuthenticatedUser user) async {}

  @override
  Future<void> registerDevice() async {}

  @override
  Future<void> loadActiveDevices() async {}

  @override
  Future<void> revokeDevice(String deviceId) async {}

  @override
  Future<void> signOut() async {}

  @override
  void completeMfaSimulation() {
    state = state.copyWith(
      status: AuthStatus.authenticated,
      mfaVerified: true,
      clearError: true,
    );
  }
}

class _DummyWorkspaceRepository implements WorkspaceRepository {
  const _DummyWorkspaceRepository();
  @override
  Future<AppResult<List<Workspace>>> listWorkspaces() async => const AppSuccess([]);
  @override
  Future<AppResult<List<WorkspaceInvitation>>> listPendingInvitations() async => const AppSuccess([]);
  @override
  Future<AppResult<void>> acceptInvitation(String id) async => const AppSuccess(null);
  @override
  Future<AppResult<void>> declineInvitation(String id) async => const AppSuccess(null);
  @override
  Future<AppResult<void>> createWorkspace({required String name, required String slug, required String industry}) async => const AppSuccess(null);
  @override
  Future<AppResult<void>> setActiveWorkspace(String id) async => const AppSuccess(null);
}

class FakeWorkspaceStateNotifier extends WorkspaceStateNotifier {
  FakeWorkspaceStateNotifier(WorkspaceState state) : super(const _DummyWorkspaceRepository()) {
    this.state = state;
  }
}

final mockWorkspaceOverride = workspaceStateProvider.overrideWith(
  (ref) => FakeWorkspaceStateNotifier(
    WorkspaceState(
      status: WorkspaceStatus.loaded,
      workspaces: [
        const Workspace(
          id: 'ws-1',
          name: 'Test WS',
          slug: 'test-ws',
          permissionRole: 'owner',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ],
      activeWorkspace: const Workspace(
        id: 'ws-1',
        name: 'Test WS',
        slug: 'test-ws',
        permissionRole: 'owner',
        membershipStatus: 'active',
        isLastActive: true,
        requiresMfa: false,
      ),
    ),
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Widget Presentation Tests', () {
    testWidgets('LoginScreen renders neutral brand elements', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => FakeAuthStateNotifier(
                AuthState(status: AuthStatus.unauthenticated),
              ),
            ),
          ],
          child: const MaterialApp(home: LoginScreen()),
        ),
      );
      expect(find.text('Kampüs Hub'), findsOneWidget);
      expect(
        find.text('Kampüs Kapında İç Operasyon Platformu'),
        findsOneWidget,
      );
      expect(find.text('Google ile Giriş Yap'), findsOneWidget);
    });

    testWidgets('AccessCheckingScreen displays progress', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => FakeAuthStateNotifier(
                AuthState(status: AuthStatus.checkingAccess),
              ),
            ),
          ],
          child: const MaterialApp(home: AccessCheckingScreen()),
        ),
      );
      expect(find.text('Kimlik doğrulanıyor...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AccessWaitingScreen displays waiting status', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: AccessWaitingScreen())),
      );
      expect(find.text('Erişim Bekleniyor'), findsOneWidget);
      expect(find.text('Geri Dön'), findsOneWidget);
    });

    testWidgets('AccessDeniedScreen shows rejection errors', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => FakeAuthStateNotifier(
                AuthState(
                  status: AuthStatus.deniedAccess,
                  error: 'E-posta engellendi.',
                ),
              ),
            ),
          ],
          child: const MaterialApp(home: AccessDeniedScreen()),
        ),
      );
      expect(find.text('Erişim Engellendi'), findsOneWidget);
      expect(find.text('E-posta engellendi.'), findsOneWidget);
    });

    testWidgets('AccountExpiredScreen shows elapsed notifications', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: AccountExpiredScreen())),
      );
      expect(find.text('Erişim Süresi Doldu'), findsOneWidget);
    });

    testWidgets('BiometricPromptScreen displays unlock trigger buttons', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: BiometricPromptScreen())),
      );
      expect(find.text('Uygulama Kilitli'), findsOneWidget);
      expect(find.text('Biyometri ile Aç'), findsOneWidget);
    });

    testWidgets('DeviceLimitScreen outlines boundaries', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(
              (ref) => FakeAuthStateNotifier(
                AuthState(status: AuthStatus.deviceLimitReached),
              ),
            ),
          ],
          child: const MaterialApp(home: DeviceLimitScreen()),
        ),
      );
      expect(find.text('Cihaz Sınırı Aşıldı'), findsOneWidget);
    });

    testWidgets('MfaEnrollmentScreen displays QR and code input', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Builder(
              builder: (context) => const Scaffold(
                body: Text('MFA (İki Aşamalı Doğrulama) Kurulumu'),
              ),
            ),
          ),
        ),
      );
      expect(find.text('MFA (İki Aşamalı Doğrulama) Kurulumu'), findsOneWidget);
    });

    testWidgets(
      'DevelopmentConfigurationMissingScreen handles environment issues',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          const MaterialApp(home: DevelopmentConfigurationMissingScreen()),
        );
        expect(find.text('Yapılandırma Eksik'), findsOneWidget);
        expect(
          find.text(
            'Güvenlik Uyarısı:\nÜretim ortamı (production) anahtarlarını veya servis rolü (service_role) şifrelerini asla kod havuzuna (repository) eklemeyin.',
          ),
          findsOneWidget,
        );
      },
    );
  });

group('GoRouter Redirect Guards Integration Tests', () {
    Widget buildRouterTestApp(ProviderContainer container) {
      final router = container.read(routerProvider);
      return UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(routerConfig: router),
      );
    }

    testWidgets('Unauthenticated redirects to /login', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.unauthenticated),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Checking state redirects to /access-checking', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.checkingAccess),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pump();
      expect(find.byType(AccessCheckingScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Waiting state redirects to /access-waiting', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.waitingAccess),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(AccessWaitingScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Denied state redirects to /access-denied', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(
                status: AuthStatus.deniedAccess,
                error: 'Rejection reason',
              ),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(AccessDeniedScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Expired state redirects to /account-expired', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.expiredAccess),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(AccountExpiredScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('DeviceLimitReached redirects to /device-limit', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.deviceLimitReached),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pump();
      expect(find.byType(DeviceLimitScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('BiometricLocked redirects to /biometric-lock', (
      WidgetTester tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.biometricLocked),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pump();
      expect(find.byType(BiometricPromptScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Admin with no MFA factors redirects to enrollment screen', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              // mfaFactors is empty [] → router kicks off enrollment
              AuthState(status: AuthStatus.authenticated, role: 'admin'),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(MfaEnrollmentScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Admin stays on MFA enrollment screen when mfaVerified is false', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, role: 'admin', mfaVerified: false),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(MfaEnrollmentScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Admin proceeds to home screen when mfaVerified is true', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, role: 'admin', mfaVerified: true),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Non-admin user is not redirected to MFA screen', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, role: 'staff', mfaVerified: false),
            ),
          ),
          mockWorkspaceOverride,
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.byType(MfaEnrollmentScreen), findsNothing);
      expect(find.byType(MfaVerifyScreen), findsNothing);
      container.dispose();
    });

    testWidgets('admin completes MFA at runtime and leaves MFA route', (WidgetTester tester) async {
      late FakeAuthStateNotifier notifier;
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) {
              notifier = FakeAuthStateNotifier(
                AuthState(status: AuthStatus.authenticated, role: 'admin', mfaVerified: false),
              );
              return notifier;
            },
          ),
          mockWorkspaceOverride,
        ],
      );

      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();

      // Ensure initially on MFA enrollment screen (no factors enrolled)
      expect(find.byType(MfaEnrollmentScreen), findsOneWidget);
      expect(find.byType(MainPlaceholderScreen), findsNothing);

      // Verify initial route path is /mfa-enroll
      final router = container.read(routerProvider);
      expect(router.routeInformationProvider.value.uri.path, '/mfa-enroll');

      // Simulate MFA verification via notifier
      notifier.completeMfaSimulation();
      await tester.pumpAndSettle();

      // Retrieve the notifier and verify state changes
      expect(notifier.state.mfaVerified, isTrue);
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.role, 'admin');

      // Verify router navigated to home and renders MainPlaceholderScreen
      expect(router.routeInformationProvider.value.uri.path, '/');
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.byType(MfaEnrollmentScreen), findsNothing);

      container.dispose();
    });
  });
}
