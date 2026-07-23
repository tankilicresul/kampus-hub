import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import '../features/auth/presentation/auth_state_notifier.dart';
import '../features/auth/presentation/screens/config_missing_screen.dart';

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configMissing = ref.watch(configMissingProvider);

    if (configMissing) {
      return const MaterialApp(
        home: DevelopmentConfigurationMissingScreen(),
        debugShowCheckedModeBanner: false,
      );
    }

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Kapında Hub',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode
          .system, // Select Light or Dark based on user system preference
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
