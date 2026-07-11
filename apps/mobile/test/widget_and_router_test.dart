import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:kampushub/core/router/app_router.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import 'package:kampushub/features/auth/presentation/screens/login_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_checking_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_waiting_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/access_denied_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/account_expired_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/biometric_prompt_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/device_limit_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/mfa_placeholder_screen.dart';
import 'package:kampushub/features/auth/presentation/screens/config_missing_screen.dart';

class FakeGoTrueClient implements supabase.GoTrueClient {
  @override
  Stream<supabase.AuthState> get onAuthStateChange => const Stream.empty();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeSupabaseClient implements supabase.SupabaseClient {
  @override
  final supabase.GoTrueClient auth = FakeGoTrueClient();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeAuthStateNotifier extends AuthStateNotifier {
  FakeAuthStateNotifier(AuthState initialState)
    : super(FakeSupabaseClient(), const FlutterSecureStorage()) {
    state = initialState;
  }

  @override
  Future<void> signInWithGoogle({
    bool simulate = false,
    String? mockEmail,
  }) async {}

  @override
  Future<void> checkAccess(supabase.User user) async {}

  @override
  Future<void> registerDevice() async {}

  @override
  Future<void> loadActiveDevices() async {}

  @override
  Future<void> revokeDevice(String deviceId) async {}

  @override
  Future<void> signOut() async {}
}

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

    testWidgets('MfaPlaceholderScreen displays secure input', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: MfaPlaceholderScreen())),
      );
      expect(find.text('MFA (İki Aşamalı Doğrulama)'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
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
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pump();
      expect(find.byType(BiometricPromptScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('Admin redirects to MFA screen', (WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, role: 'admin'),
            ),
          ),
        ],
      );
      await tester.pumpWidget(buildRouterTestApp(container));
      await tester.pumpAndSettle();
      expect(find.byType(MfaPlaceholderScreen), findsOneWidget);
      container.dispose();
    });
  });
}
