import 'dart:async';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kampushub/core/logging/app_logger.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/core/errors/app_failure.dart';
import 'package:kampushub/core/errors/failure_mapper.dart';
import 'package:kampushub/core/async/operation_class.dart';
import 'package:kampushub/core/async/timeout_policy.dart';
import 'package:kampushub/core/async/retry_policy.dart';
import '../../domain/models/authenticated_user.dart';
import '../../domain/models/access_check_result.dart';
import '../../domain/models/mfa_enrollment.dart';
import '../../domain/models/mfa_factor.dart';
import '../../domain/repositories/auth_repository.dart';

final class SupabaseAuthRepository implements AuthRepository {
  final SupabaseClient supabase;
  final AppLogger logger;
  /// Native Google Sign-In client. Injected for testability.
  final GoogleSignIn googleSignIn;

  SupabaseAuthRepository(
    this.supabase, {
    this.logger = const NoopAppLogger(),
    GoogleSignIn? googleSignIn,
  }) : googleSignIn = googleSignIn ?? GoogleSignIn();

  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged {
    return supabase.auth.onAuthStateChange.map((data) {
      final user = data.session?.user;
      if (user == null) return null;
      return AuthenticatedUser(
        id: user.id,
        email: user.email ?? '',
      );
    });
  }

  @override
  AuthenticatedUser? get currentUser {
    final user = supabase.auth.currentUser;
    if (user == null) return null;
    return AuthenticatedUser(
      id: user.id,
      email: user.email ?? '',
    );
  }

  /// Signs in with Google using the native Google Sign-In flow.
  ///
  /// On Android, this presents the native account chooser dialog — no browser
  /// popup is opened. The resulting ID token is exchanged with Supabase via
  /// [signInWithIdToken], which is the recommended approach for mobile apps.
  ///
  /// Falls back to returning [AuthenticationFailure] if the user cancels or
  /// if credentials are missing.
  @override
  Future<AppResult<void>> signInWithGoogle() async {
    try {
      // 1. Trigger native Google account picker
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled the sign-in dialog
        const failure = AuthenticationFailure(
          technicalMessage: 'Google Sign-In cancelled by user',
          userMessage: 'Google girişi iptal edildi.',
        );
        logger.warning('signInWithGoogle: user cancelled');
        return const AppError(failure);
      }

      // 2. Get authentication tokens
      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      final accessToken = googleAuth.accessToken;

      if (idToken == null) {
        const failure = AuthenticationFailure(
          technicalMessage: 'Google Sign-In: idToken is null',
          userMessage: 'Google kimlik doğrulaması başarısız oldu.',
        );
        logger.error('signInWithGoogle: idToken is null');
        return const AppError(failure);
      }

      // 3. Exchange with Supabase
      // ignore: experimental_member_use
      await supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error(
        'signInWithGoogle failed',
        error: e,
        stackTrace: st,
      );
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<void>> signInWithEmail({required String email, required String password}) async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    try {
      await supabase.auth.signInWithPassword(email: email, password: password).timeout(timeout);
      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('signInWithEmail failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<void>> signUpWithEmail({required String email, required String password}) async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    try {
      await supabase.auth.signUp(email: email, password: password).timeout(timeout);
      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('signUpWithEmail failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async {
    const op = OperationClass.safeRead;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc('check_current_user_access')
            .timeout(timeout);

        if (response is! Map) {
          throw const DatabaseFailure(
            technicalMessage: 'check_current_user_access RPC did not return a Map',
          );
        }

        final allowed = response['allowed'];
        final reason = response['reason'];
        if (allowed is! bool || reason is! String) {
          throw const ValidationFailure(
            technicalMessage: 'check_current_user_access RPC response missing allowed or reason field',
          );
        }

        final role = response['role'] as String?;
        final universityId = response['university_id'] as String?;

        return AppSuccess(
          AccessCheckResult(
            allowed: allowed,
            reason: reason,
            role: role,
            universityId: universityId,
          ),
        );
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'checkCurrentUserAccess attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'checkCurrentUserAccess final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> signOut() async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      await supabase.auth.signOut().timeout(timeout);
      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error(
        'signOut failed',
        error: e,
        stackTrace: st,
      );
      return AppError(failure);
    }
  }

  // ── MFA / TOTP ──────────────────────────────────────────────────────────

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      final response = await supabase.auth.mfa
          .enroll(factorType: FactorType.totp)
          .timeout(timeout);

      return AppSuccess(
        MfaEnrollment(
          factorId: response.id,
          qrCodeUri: response.totp.qrCode,
          secret: response.totp.secret,
        ),
      );
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('enrollMfaTotp failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      // 1. List factors to find the verified TOTP factor
      final factorsRes = await supabase.auth.mfa.listFactors();
      final totpFactors = factorsRes.totp;

      if (totpFactors.isEmpty) {
        const failure = AuthenticationFailure(
          technicalMessage: 'No TOTP factors enrolled for this user',
        );
        return const AppError(failure);
      }

      // Use the first verified factor; fall back to first factor
      final factor = totpFactors.firstWhere(
        (f) => f.status == FactorStatus.verified,
        orElse: () => totpFactors.first,
      );

      // 2. Create a challenge
      final challenge = await supabase.auth.mfa
          .challenge(factorId: factor.id)
          .timeout(timeout);

      // 3. Verify with the user-provided code
      await supabase.auth.mfa
          .verify(
            factorId: factor.id,
            challengeId: challenge.id,
            code: code,
          )
          .timeout(timeout);

      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('challengeAndVerifyMfa failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async {
    try {
      final response = await supabase.auth.mfa.listFactors();
      final factors = response.totp.map((f) {
        return MfaFactor(
          id: f.id,
          status: f.status.name,
          factorType: 'totp',
          createdAt: f.createdAt,
        );
      }).toList();
      return AppSuccess(factors);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('listMfaFactors failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async {
    const op = OperationClass.securitySensitive;
    final timeout = TimeoutPolicy.defaults.forOperation(op);

    try {
      await supabase.auth.mfa
          .unenroll(factorId)
          .timeout(timeout);
      return const AppSuccess(null);
    } catch (e, st) {
      final failure = FailureMapper.map(e, stackTrace: st);
      logger.error('unenrollMfaFactor failed', error: e, stackTrace: st);
      return AppError(failure);
    }
  }
}
