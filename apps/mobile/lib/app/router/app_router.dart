import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/auth_state_notifier.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/access_checking_screen.dart';
import '../../features/auth/presentation/screens/access_waiting_screen.dart';
import '../../features/auth/presentation/screens/access_denied_screen.dart';
import '../../features/auth/presentation/screens/account_expired_screen.dart';
import '../../features/auth/presentation/screens/biometric_prompt_screen.dart';
import '../../features/auth/presentation/screens/device_limit_screen.dart';
import '../../features/auth/presentation/screens/mfa_enrollment_screen.dart';
import '../../features/auth/presentation/screens/mfa_verify_screen.dart';
import '../../features/workspace/presentation/workspace_state_notifier.dart';
import '../../features/workspace/presentation/screens/workspace_checking_screen.dart';
import '../../features/workspace/presentation/screens/invitation_onboarding_screen.dart';
import '../../features/workspace/presentation/screens/workspace_creation_screen.dart';
import '../../features/workspace/presentation/widgets/workspace_switcher_drawer.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final status = authState.status;

      final isLoggingIn = state.matchedLocation == '/login';

      if (status == AuthStatus.unauthenticated) {
        return '/login';
      }

      if (status == AuthStatus.checkingAccess) {
        if (state.matchedLocation != '/access-checking') {
          return '/access-checking';
        }
        return null;
      }

      if (status == AuthStatus.waitingAccess) {
        if (state.matchedLocation != '/access-waiting') {
          return '/access-waiting';
        }
        return null;
      }

      if (status == AuthStatus.deniedAccess) {
        if (state.matchedLocation != '/access-denied') {
          return '/access-denied';
        }
        return null;
      }

      if (status == AuthStatus.expiredAccess) {
        if (state.matchedLocation != '/account-expired') {
          return '/account-expired';
        }
        return null;
      }

      if (status == AuthStatus.deviceLimitReached) {
        if (state.matchedLocation != '/device-limit') {
          return '/device-limit';
        }
        return null;
      }

      if (status == AuthStatus.biometricLocked) {
        if (state.matchedLocation != '/biometric-lock') {
          return '/biometric-lock';
        }
        return null;
      }

      if (status == AuthStatus.enrollingMfa) {
        if (state.matchedLocation != '/mfa-enroll') {
          return '/mfa-enroll';
        }
        return null;
      }

      // Check Admin MFA Requirement
      if (status == AuthStatus.authenticated && authState.role == 'admin') {
        if (!authState.mfaVerified) {
          // Determine whether the user already has a verified TOTP factor.
          // We check the cached list; if empty we trigger an async load.
          // The notifier will update state.mfaFactors on the next build.
          final factors = authState.mfaFactors;
          final hasVerifiedFactor = factors.any((f) => f.isVerified);

          if (hasVerifiedFactor) {
            // Factor exists → go to verify screen
            if (state.matchedLocation != '/mfa-verify') {
              return '/mfa-verify';
            }
            return null;
          } else {
            // No verified factor → go to enrollment screen
            // If we're not yet in enrollingMfa status, kick off enrollment
            if (state.matchedLocation != '/mfa-enroll') {
              // Trigger enrollment lazily (microtask to avoid redirect loop)
              if (authState.mfaEnrollment == null &&
                  status != AuthStatus.enrollingMfa) {
                Future.microtask(() {
                  ref.read(authStateProvider.notifier).enrollMfa();
                });
              }
              return '/mfa-enroll';
            }
            return null;
          }
        }
      }

      // Check Workspace Onboarding Requirement — runs for all authenticated users
      // that have passed MFA (or are not required to do so)

      // Check Workspace Onboarding Requirement
      if (status == AuthStatus.authenticated && (authState.role != 'admin' || authState.mfaVerified)) {
        final workspaceState = ref.read(workspaceStateProvider);

        if (workspaceState.status == WorkspaceStatus.initial ||
            workspaceState.status == WorkspaceStatus.loading ||
            workspaceState.status == WorkspaceStatus.error) {
          if (state.matchedLocation != '/workspace-checking') {
            return '/workspace-checking';
          }
          return null;
        }

        if (workspaceState.workspaces.isEmpty) {
          if (workspaceState.invitations.isNotEmpty) {
            if (state.matchedLocation != '/invitations') {
              return '/invitations';
            }
            return null;
          } else {
            if (state.matchedLocation != '/create-workspace') {
              return '/create-workspace';
            }
            return null;
          }
        }

        if (workspaceState.activeWorkspace == null) {
          if (state.matchedLocation != '/invitations') {
            return '/invitations';
          }
          return null;
        }
      }

      // Redirect away from any auth/intermediate screens once fully authenticated
      if (isLoggingIn ||
          state.matchedLocation == '/access-checking' ||
          state.matchedLocation == '/access-waiting' ||
          state.matchedLocation == '/access-denied' ||
          state.matchedLocation == '/account-expired' ||
          state.matchedLocation == '/device-limit' ||
          state.matchedLocation == '/biometric-lock' ||
          state.matchedLocation == '/mfa-verify' ||
          state.matchedLocation == '/mfa-enroll' ||
          state.matchedLocation == '/workspace-checking' ||
          state.matchedLocation == '/invitations' ||
          state.matchedLocation == '/create-workspace') {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/access-checking',
        builder: (context, state) => const AccessCheckingScreen(),
      ),
      GoRoute(
        path: '/access-waiting',
        builder: (context, state) => const AccessWaitingScreen(),
      ),
      GoRoute(
        path: '/access-denied',
        builder: (context, state) => const AccessDeniedScreen(),
      ),
      GoRoute(
        path: '/account-expired',
        builder: (context, state) => const AccountExpiredScreen(),
      ),
      GoRoute(
        path: '/device-limit',
        builder: (context, state) => const DeviceLimitScreen(),
      ),
      GoRoute(
        path: '/biometric-lock',
        builder: (context, state) => const BiometricPromptScreen(),
      ),
      GoRoute(
        path: '/mfa-enroll',
        builder: (context, state) => const MfaEnrollmentScreen(),
      ),
      GoRoute(
        path: '/mfa-verify',
        builder: (context, state) => const MfaVerifyScreen(),
      ),
      GoRoute(
        path: '/workspace-checking',
        builder: (context, state) => const WorkspaceCheckingScreen(),
      ),
      GoRoute(
        path: '/invitations',
        builder: (context, state) => const InvitationOnboardingScreen(),
      ),
      GoRoute(
        path: '/create-workspace',
        builder: (context, state) => const WorkspaceCreationScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const MainPlaceholderScreen(),
      ),
    ],
  );

  // Re-run redirect when auth or workspace state changes
  ref.listen<AuthState>(authStateProvider, (previous, next) {
    router.refresh();
  });

  ref.listen<WorkspaceState>(workspaceStateProvider, (previous, next) {
    router.refresh();
  });

  return router;
});

// Simple placeholder for main app screen
class MainPlaceholderScreen extends ConsumerWidget {
  const MainPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final workspaceState = ref.watch(workspaceStateProvider);
    final activeWorkspace = workspaceState.activeWorkspace;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kampüs Hub Dashboard'),
      ),
      drawer: const WorkspaceSwitcherDrawer(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Hoş Geldiniz!',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 20),
              if (activeWorkspace != null) ...[
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Icon(Icons.business_rounded, size: 48, color: Color(0xFF6366F1)),
                      const SizedBox(height: 12),
                      Text(
                        activeWorkspace.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Slug: ${activeWorkspace.slug}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      ),
                      Text(
                        'Workspace Rolü: ${activeWorkspace.permissionRole}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
              Text(
                'E-posta: ${auth.email ?? "Bilinmiyor"}',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              Text(
                'Global Rol: ${auth.role ?? "Bilinmiyor"}',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              Text(
                'Üniversite ID: ${auth.universityId ?? "Atanmamış"}',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
