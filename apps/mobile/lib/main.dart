import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app/app.dart';
import 'core/constants/constants.dart';
import 'core/utils/inactivity_tracker.dart';
import 'features/auth/presentation/auth_state_notifier.dart';
import 'features/auth/di/auth_dependencies.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  bool configMissing = false;

  if (AppConstants.defaultSupabaseUrl.isEmpty ||
      AppConstants.defaultSupabaseAnonKey.isEmpty ||
      AppConstants.defaultSupabaseUrl.contains('PLACEHOLDER') ||
      AppConstants.defaultSupabaseAnonKey.contains('PLACEHOLDER')) {
    configMissing = true;
  }

  if (!configMissing) {
    try {
      // Initialize Supabase Local Client Connection
      await Supabase.initialize(
        url: AppConstants.defaultSupabaseUrl,
        anonKey: AppConstants.defaultSupabaseAnonKey,
      );
    } catch (_) {
      configMissing = true;
    }
  }

  runApp(
    ProviderScope(
      overrides: [configMissingProvider.overrideWithValue(configMissing)],
      child: const MainAppContainer(),
    ),
  );
}

class MainAppContainer extends ConsumerStatefulWidget {
  const MainAppContainer({super.key});

  @override
  ConsumerState<MainAppContainer> createState() => _MainAppContainerState();
}

class _MainAppContainerState extends ConsumerState<MainAppContainer> {
  late InactivityTracker _inactivityTracker;

  @override
  void initState() {
    super.initState();
    final storage = ref.read(secureStorageProvider);
    _inactivityTracker = InactivityTracker(storage);

    // When inactivity is detected, mark state status to lock redirect
    _inactivityTracker.initialize(() {
      final notifier = ref.read(authStateProvider.notifier);
      final authState = ref.read(authStateProvider);

      if (authState.status == AuthStatus.authenticated) {
        // Sets status state to biometricLocked
        notifier.signOut(); // Lock out user safely
      }
    });
  }

  @override
  void dispose() {
    _inactivityTracker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Intercept user interactions to reset the activity timer
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => _inactivityTracker.updateActivity(),
      onPanDown: (_) => _inactivityTracker.updateActivity(),
      child: const MyApp(),
    );
  }
}
