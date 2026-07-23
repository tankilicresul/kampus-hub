import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/app/router/app_router.dart';
import 'package:kampushub/core/result/app_result.dart';
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
import 'package:kampushub/features/workspace/presentation/workspace_state_notifier.dart';
import 'package:kampushub/features/workspace/domain/models/workspace.dart';
import 'package:kampushub/features/workspace/domain/models/workspace_invitation.dart';
import 'package:kampushub/features/workspace/domain/repositories/workspace_repository.dart';
import 'package:kampushub/features/workspace/di/workspace_dependencies.dart';
import 'package:kampushub/features/workspace/presentation/screens/workspace_checking_screen.dart';
import 'package:kampushub/features/workspace/presentation/screens/invitation_onboarding_screen.dart';
import 'package:kampushub/features/workspace/presentation/screens/workspace_creation_screen.dart';
import 'package:kampushub/features/workspace/presentation/widgets/workspace_switcher_drawer.dart';

class _MockAuthRepository implements AuthRepository {
  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();
  @override
  AuthenticatedUser? get currentUser => const AuthenticatedUser(
        id: 'user-123',
        email: 'test@kampushub.com',
      );
  @override
  Future<AppResult<void>> signInWithGoogle() async => const AppSuccess(null);
  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async => const AppSuccess(null);
  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async => const AppSuccess(null);
  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async => const AppSuccess(
        AccessCheckResult(allowed: true, reason: 'active'),
      );
  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);
  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async => const AppSuccess(
        MfaEnrollment(factorId: 'id', qrCodeUri: 'uri', secret: 'sec'),
      );
  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async => const AppSuccess(null);
  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async => const AppSuccess([]);
  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async => const AppSuccess(null);
}

class _MockDeviceSecurityRepository implements DeviceSecurityRepository {
  @override
  Future<AppResult<DeviceRegistrationResult>> registerCurrentDevice({
    required String appVersion,
    required String pushToken,
  }) async =>
      const AppSuccess(DeviceRegistrationResult(status: DeviceRegistrationStatus.registered));
  @override
  Future<AppResult<List<RegisteredDevice>>> listActiveDevices() async => const AppSuccess([]);
  @override
  Future<AppResult<void>> revokeDevice(String deviceId) async => const AppSuccess(null);
  @override
  Future<AppResult<bool>> isBiometricEnabled() async => const AppSuccess(false);
  @override
  Future<AppResult<void>> setBiometricEnabled(bool enabled) async => const AppSuccess(null);
  @override
  Future<AppResult<String>> getOrCreateDeviceHash() async => const AppSuccess('hash');
}

class _MockWorkspaceRepository implements WorkspaceRepository {
  List<Workspace> workspaces = [];
  List<WorkspaceInvitation> invitations = [];
  bool shouldFailListWorkspaces = false;
  bool shouldFailSelect = false;
  String? activeWorkspaceId;
  String? acceptedInvitationId;
  String? declinedInvitationId;
  bool workspaceCreated = false;
  Duration? delay;

  @override
  Future<AppResult<List<Workspace>>> listWorkspaces() async {
    if (delay != null) {
      await Future<void>.delayed(delay!);
    }
    if (shouldFailListWorkspaces) {
      return const AppError(DatabaseFailure(technicalMessage: 'DB error occurred'));
    }
    return AppSuccess(workspaces);
  }

  @override
  Future<AppResult<List<WorkspaceInvitation>>> listPendingInvitations() async {
    if (delay != null) {
      await Future<void>.delayed(delay!);
    }
    return AppSuccess(invitations);
  }

  @override
  Future<AppResult<void>> acceptInvitation(String invitationId) async {
    acceptedInvitationId = invitationId;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> declineInvitation(String invitationId) async {
    declinedInvitationId = invitationId;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> createWorkspace({
    required String name,
    required String slug,
    required String industry,
  }) async {
    workspaceCreated = true;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> setActiveWorkspace(String workspaceId) async {
    if (shouldFailSelect) {
      return const AppError(DatabaseFailure(technicalMessage: 'Access denied to workspace'));
    }
    activeWorkspaceId = workspaceId;
    return const AppSuccess(null);
  }
}

class FakeAuthStateNotifier extends AuthStateNotifier {
  FakeAuthStateNotifier(AuthState initialState)
      : super(_MockAuthRepository(), _MockDeviceSecurityRepository()) {
    state = initialState;
  }

  @override
  Future<void> signInWithGoogle({bool simulate = false, String? mockEmail}) async {}

  @override
  Future<void> checkAccess(AuthenticatedUser user) async {}

  @override
  Future<void> registerDevice() async {}

  @override
  Future<void> loadActiveDevices() async {}

  @override
  Future<void> revokeDevice(String deviceId) async {}

  @override
  Future<void> signOut() async {
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _MockWorkspaceRepository mockRepo;

  setUp(() {
    mockRepo = _MockWorkspaceRepository();
  });

  Widget buildTestApp(ProviderContainer container) {
    final router = container.read(routerProvider);
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(routerConfig: router),
    );
  }

  group('Workspace Routing and Flow Integration Tests', () {
    testWidgets('1. Membership exists, single workspace: automatically selects active and opens dashboard', (WidgetTester tester) async {
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'Workspace 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: false, // will auto select
          requiresMfa: false,
        )
      ];
      // Give a tiny delay so we can capture the checking screen
      mockRepo.delay = const Duration(milliseconds: 50);

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump(); // Start build and load data (triggers delayed call)
      
      expect(find.byType(WorkspaceCheckingScreen), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 60)); // Let delay resolve
      await tester.pumpAndSettle(); // Resolve redirect and animations

      expect(mockRepo.activeWorkspaceId, 'ws-1');
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.text('Workspace 1'), findsOneWidget);
      container.dispose();
    });

    testWidgets('2. No membership, pending invitations exist: redirects to invitations screen', (WidgetTester tester) async {
      mockRepo.workspaces = [];
      mockRepo.invitations = [
        WorkspaceInvitation(
          id: 'inv-123',
          workspaceName: 'Pending Workspace',
          permissionRole: 'member',
          jobRole: 'operations',
          universityScopes: const [],
          createdAt: DateTime.now(),
        )
      ];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(InvitationOnboardingScreen), findsOneWidget);
      expect(find.text('Pending Workspace'), findsOneWidget);
      container.dispose();
    });

    testWidgets('3. No membership, no invitations: redirects to workspace creation screen', (WidgetTester tester) async {
      mockRepo.workspaces = [];
      mockRepo.invitations = [];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(WorkspaceCreationScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('4. Multiple workspaces: switcher drawer allows switching active workspace', (WidgetTester tester) async {
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'Workspace 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        ),
        const Workspace(
          id: 'ws-2',
          name: 'Workspace 2',
          slug: 'ws-2',
          permissionRole: 'admin',
          membershipStatus: 'active',
          isLastActive: false,
          requiresMfa: false,
        )
      ];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      // Renders Dashboard with Workspace 1 active
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.text('Workspace 1'), findsOneWidget);

      // Open drawer
      final scaffoldState = tester.firstState<ScaffoldState>(find.byType(Scaffold));
      scaffoldState.openDrawer();
      await tester.pumpAndSettle();

      expect(find.byType(WorkspaceSwitcherDrawer), findsOneWidget);
      expect(find.text('Workspace 2'), findsOneWidget);

      // Prepare next db data state before tap, so the subsequent load gets the correct active workspace
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'Workspace 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: false,
          requiresMfa: false,
        ),
        const Workspace(
          id: 'ws-2',
          name: 'Workspace 2',
          slug: 'ws-2',
          permissionRole: 'admin',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];

      // Tap Workspace 2
      await tester.tap(find.text('Workspace 2'));
      await tester.pumpAndSettle();

      expect(mockRepo.activeWorkspaceId, 'ws-2');
      container.dispose();
    });

    testWidgets('5. App load / restart: active workspace is restored properly if last active exists', (WidgetTester tester) async {
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-active',
          name: 'Active WS',
          slug: 'active-ws',
          permissionRole: 'owner',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.text('Active WS'), findsOneWidget);
      expect(container.read(workspaceStateProvider).activeWorkspace?.id, 'ws-active');
      container.dispose();
    });

    testWidgets('6. Invitation Accept: membership is refreshed and workspace becomes active', (WidgetTester tester) async {
      mockRepo.workspaces = [];
      mockRepo.invitations = [
        WorkspaceInvitation(
          id: 'inv-1',
          workspaceName: 'Invitation WS',
          permissionRole: 'member',
          jobRole: 'operations',
          universityScopes: const [],
          createdAt: DateTime.now(),
        )
      ];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(InvitationOnboardingScreen), findsOneWidget);

      // Mock update workspaces and invitations in mock repo BEFORE the load triggered by accept resolves
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-new',
          name: 'Invitation WS',
          slug: 'invitation-ws',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];
      mockRepo.invitations = [];

      // Tap Accept
      await tester.tap(find.text('Kabul Et'));
      await tester.pumpAndSettle();

      expect(mockRepo.acceptedInvitationId, 'inv-1');
      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.text('Invitation WS'), findsOneWidget);
      container.dispose();
    });

    testWidgets('7. Invitation Reject: invitation removed and screen transitions to creation', (WidgetTester tester) async {
      mockRepo.workspaces = [];
      mockRepo.invitations = [
        WorkspaceInvitation(
          id: 'inv-1',
          workspaceName: 'Invitation WS',
          permissionRole: 'member',
          jobRole: 'operations',
          universityScopes: const [],
          createdAt: DateTime.now(),
        )
      ];

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(InvitationOnboardingScreen), findsOneWidget);

      // Mock invitations empty BEFORE accept/decline reload happens
      mockRepo.invitations = [];

      // Tap Decline
      await tester.tap(find.text('Reddet'));
      await tester.pumpAndSettle();

      expect(mockRepo.declinedInvitationId, 'inv-1');
      expect(find.byType(WorkspaceCreationScreen), findsOneWidget);
      container.dispose();
    });

    testWidgets('8. Unauthorized workspace ID cannot be set by client', (WidgetTester tester) async {
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];
      mockRepo.shouldFailSelect = true; // DB RLS / constraint failure mock

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      final notifier = container.read(workspaceStateProvider.notifier);
      final res = await notifier.selectWorkspace('ws-unauthorized');

      expect(res.isError, isTrue);
      expect((res as AppError).failure.userMessage, contains('veri hatası'));
      container.dispose();
    });

    testWidgets('9. Network / Supabase error: handles gracefully and displays retry screen', (WidgetTester tester) async {
      mockRepo.shouldFailListWorkspaces = true;

      final container = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => FakeAuthStateNotifier(
              AuthState(status: AuthStatus.authenticated, email: 'test@kampushub.com', role: 'staff'),
            ),
          ),
          workspaceRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );

      await tester.pumpWidget(buildTestApp(container));
      await tester.pump();
      await tester.pumpAndSettle();

      // Because list fails, workspaceState status is .error, so it redirects/stays on WorkspaceCheckingScreen
      expect(find.byType(WorkspaceCheckingScreen), findsOneWidget);
      expect(find.text('Bağlantı Hatası'), findsOneWidget);
      expect(find.text('Tekrar Dene'), findsOneWidget);

      // Fix error, mock workspace list payload
      mockRepo.shouldFailListWorkspaces = false;
      mockRepo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];

      // Tap retry
      await tester.tap(find.text('Tekrar Dene'));
      await tester.pumpAndSettle();

      expect(find.byType(MainPlaceholderScreen), findsOneWidget);
      expect(find.text('WS 1'), findsOneWidget);
      container.dispose();
    });
  });
}
