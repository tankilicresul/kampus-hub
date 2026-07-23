import 'package:kapindahub/core/result/app_result.dart';
import '../models/authenticated_user.dart';
import '../models/access_check_result.dart';
import '../models/mfa_enrollment.dart';
import '../models/mfa_factor.dart';

abstract interface class AuthRepository {
  Stream<AuthenticatedUser?> get onAuthStateChanged;

  AuthenticatedUser? get currentUser;

  Future<AppResult<void>> signInWithGoogle();
  
  Future<AppResult<void>> signInWithEmail({required String email, required String password});
  
  Future<AppResult<void>> signUpWithEmail({required String email, required String password});

  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess();

  Future<AppResult<void>> signOut();

  // ── MFA / TOTP ──────────────────────────────────────────────────────────

  /// Enrolls a new TOTP factor. Returns a QR code URI and secret for display.
  /// The factor must be verified via [challengeAndVerifyMfa] to become active.
  Future<AppResult<MfaEnrollment>> enrollMfaTotp();

  /// Issues a challenge for an existing TOTP factor and verifies the given
  /// one-time [code]. On success the session AAL is elevated to aal2.
  Future<AppResult<void>> challengeAndVerifyMfa({required String code});

  /// Lists all MFA factors enrolled for the current user.
  Future<AppResult<List<MfaFactor>>> listMfaFactors();

  /// Unenrolls (removes) the factor with the given [factorId].
  Future<AppResult<void>> unenrollMfaFactor(String factorId);
}
