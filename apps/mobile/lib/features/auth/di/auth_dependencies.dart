import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:kapindahub/features/auth/domain/repositories/auth_repository.dart';
import 'package:kapindahub/features/auth/domain/repositories/device_security_repository.dart';
import 'package:kapindahub/features/auth/data/repositories/supabase_auth_repository.dart';
import 'package:kapindahub/features/auth/data/repositories/supabase_device_security_repository.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(),
);

final supabaseClientProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

/// Native Google Sign-In client provider.
///
/// Configured with no explicit [scopes] — Supabase only needs the ID token
/// which the default configuration provides. Additional scopes (e.g. email)
/// are granted by the Google account chooser automatically.
final googleSignInProvider = Provider<GoogleSignIn>(
  (ref) => GoogleSignIn(),
);

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final googleSignIn = ref.watch(googleSignInProvider);
  return SupabaseAuthRepository(supabase, googleSignIn: googleSignIn);
});

final deviceSecurityRepositoryProvider = Provider<DeviceSecurityRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return SupabaseDeviceSecurityRepository(supabase, storage, DeviceInfoPlugin());
});

