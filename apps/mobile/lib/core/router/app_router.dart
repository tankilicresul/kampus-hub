import 'dart:async';
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
import '../../features/auth/presentation/screens/mfa_placeholder_screen.dart';

// Adapter to listen to Stream changes inside GoRouter refreshListenable
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.read(authStateProvider.notifier);

  return GoRouter(
    initialLocation: '/login',
    // Re-evaluates redirects whenever the authentication state changes
    refreshListenable: GoRouterRefreshStream(authNotifier.stream),
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

      // Check Admin MFA Requirement
      if (status == AuthStatus.authenticated && authState.role == 'admin') {
        // Admin must undergo MFA. In this milestone, we load a placeholder guard if MFA level is insufficient
        // Redirect to /mfa if they aren't on the mfa page and haven't verified
        if (state.matchedLocation != '/mfa') {
          return '/mfa';
        }
        return null;
      }

      // Authenticated normal roles
      if (isLoggingIn ||
          state.matchedLocation == '/access-checking' ||
          state.matchedLocation == '/access-waiting' ||
          state.matchedLocation == '/access-denied' ||
          state.matchedLocation == '/account-expired' ||
          state.matchedLocation == '/device-limit' ||
          state.matchedLocation == '/biometric-lock') {
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
        path: '/mfa',
        builder: (context, state) => const MfaPlaceholderScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const MainPlaceholderScreen(),
      ),
    ],
  );
});

// Simple placeholder for main app screen
class MainPlaceholderScreen extends ConsumerWidget {
  const MainPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kampüs Hub Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              // Confirmation logout dialog
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Çıkış Yap'),
                  content: const Text(
                    'Oturumunuzu kapatmak istediğinize emin misiniz?',
                  ),
                  actions: [
                    TextButton(
                      child: const Text('İptal'),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                    TextButton(
                      child: const Text('Çıkış'),
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        ref.read(authStateProvider.notifier).signOut();
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
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
              const SizedBox(height: 10),
              Text(
                'E-posta: ${auth.email ?? "Bilinmiyor"}',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              Text(
                'Rol: ${auth.role ?? "Bilinmiyor"}',
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
