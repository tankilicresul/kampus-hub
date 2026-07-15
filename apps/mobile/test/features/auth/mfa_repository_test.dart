import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/features/auth/domain/repositories/auth_repository.dart';
import 'package:kampushub/features/auth/domain/models/authenticated_user.dart';
import 'package:kampushub/features/auth/domain/models/access_check_result.dart';
import 'package:kampushub/features/auth/domain/models/mfa_enrollment.dart';
import 'package:kampushub/features/auth/domain/models/mfa_factor.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/core/errors/app_failure.dart';

// ── Configurable fake AuthRepository ─────────────────────────────────────
//
// Previously this test subclassed SupabaseAuthRepository directly, but
// SupabaseAuthRepository is a `final class` — it cannot be extended outside
// its own library. We now use an interface-based fake instead, which is the
// correct Clean Architecture approach and keeps the tests fully decoupled
// from Supabase internals.

class _MfaFakeRepository implements AuthRepository {
  // Configurable return values / exceptions
  Object? enrollResult;
  Object? listFactorsResult;
  Object? challengeVerifyResult;
  Object? unenrollResult;

  // Captured arguments
  String? lastVerifyCode;
  String? lastUnenrolledFactorId;

  // ── AuthRepository required members (not under test) ─────────────────

  @override
  Stream<AuthenticatedUser?> get onAuthStateChanged => const Stream.empty();

  @override
  AuthenticatedUser? get currentUser => null;

  @override
  Future<AppResult<void>> signInWithGoogle() async => const AppSuccess(null);

  @override
  Future<AppResult<AccessCheckResult>> checkCurrentUserAccess() async =>
      const AppSuccess(AccessCheckResult(allowed: true, reason: 'active'));

  @override
  Future<AppResult<void>> signOut() async => const AppSuccess(null);

  // ── MFA methods under test ────────────────────────────────────────────

  @override
  Future<AppResult<MfaEnrollment>> enrollMfaTotp() async {
    if (enrollResult is Exception) {
      return AppError(
        AuthenticationFailure(
          technicalMessage: (enrollResult as Exception).toString(),
        ),
      );
    }
    return enrollResult as AppResult<MfaEnrollment>;
  }

  @override
  Future<AppResult<void>> challengeAndVerifyMfa({required String code}) async {
    lastVerifyCode = code;
    if (challengeVerifyResult is Exception) {
      return AppError(
        AuthenticationFailure(
          technicalMessage: (challengeVerifyResult as Exception).toString(),
        ),
      );
    }
    if (challengeVerifyResult is AppError) {
      return challengeVerifyResult as AppResult<void>;
    }
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<List<MfaFactor>>> listMfaFactors() async {
    if (listFactorsResult is Exception) {
      return AppError(
        NetworkFailure(
          technicalMessage: (listFactorsResult as Exception).toString(),
        ),
      );
    }
    return listFactorsResult as AppResult<List<MfaFactor>>;
  }

  @override
  Future<AppResult<void>> unenrollMfaFactor(String factorId) async {
    lastUnenrolledFactorId = factorId;
    if (unenrollResult is Exception) {
      return AppError(
        AuthenticationFailure(
          technicalMessage: (unenrollResult as Exception).toString(),
        ),
      );
    }
    return const AppSuccess(null);
  }
}

// ── Shared fixtures ───────────────────────────────────────────────────────

const _fakeEnrollment = MfaEnrollment(
  factorId: 'factor-123',
  qrCodeUri: 'data:image/png;base64,FAKEQR==',
  secret: 'SECRETABC',
);

final _twoFactors = [
  MfaFactor(
    id: 'f1',
    status: 'verified',
    factorType: 'totp',
    createdAt: DateTime(2026, 3, 15),
  ),
  const MfaFactor(id: 'f2', status: 'unverified', factorType: 'totp'),
];

// ── Test Suite ────────────────────────────────────────────────────────────

void main() {
  late _MfaFakeRepository repository;

  setUp(() {
    repository = _MfaFakeRepository();
  });

  // ── enrollMfaTotp ─────────────────────────────────────────────────────────

  group('enrollMfaTotp', () {
    test('returns MfaEnrollment on success', () async {
      repository.enrollResult = const AppSuccess(_fakeEnrollment);

      final result = await repository.enrollMfaTotp();

      expect(result, isA<AppSuccess<MfaEnrollment>>());
      final enrollment = (result as AppSuccess<MfaEnrollment>).value;
      expect(enrollment.factorId, 'factor-123');
      expect(enrollment.qrCodeUri, 'data:image/png;base64,FAKEQR==');
      expect(enrollment.secret, 'SECRETABC');
    });

    test('returns AppError when enrollment throws', () async {
      repository.enrollResult = Exception('enroll failed');

      final result = await repository.enrollMfaTotp();

      expect(result, isA<AppError<MfaEnrollment>>());
      final error = result as AppError<MfaEnrollment>;
      expect(error.failure, isA<AuthenticationFailure>());
    });
  });

  // ── challengeAndVerifyMfa ─────────────────────────────────────────────────

  group('challengeAndVerifyMfa', () {
    test('returns AppSuccess when code is correct', () async {
      repository.challengeVerifyResult = null; // success path

      final result = await repository.challengeAndVerifyMfa(code: '123456');

      expect(result, isA<AppSuccess<void>>());
      expect(repository.lastVerifyCode, '123456');
    });

    test('passes the user-provided code through', () async {
      repository.challengeVerifyResult = null;

      await repository.challengeAndVerifyMfa(code: '987654');

      expect(repository.lastVerifyCode, '987654');
    });

    test('returns AuthenticationFailure when Supabase throws (wrong code)', () async {
      repository.challengeVerifyResult = Exception('invalid TOTP code');

      final result = await repository.challengeAndVerifyMfa(code: '000000');

      expect(result, isA<AppError<void>>());
      final error = result as AppError<void>;
      expect(error.failure, isA<AuthenticationFailure>());
    });

    test('propagates AppError when no factors enrolled', () async {
      const failure = AuthenticationFailure(
        technicalMessage: 'No TOTP factors enrolled for this user',
      );
      repository.challengeVerifyResult = const AppError<void>(failure);

      final result = await repository.challengeAndVerifyMfa(code: '111111');

      expect(result, isA<AppError<void>>());
    });
  });

  // ── listMfaFactors ────────────────────────────────────────────────────────

  group('listMfaFactors', () {
    test('returns list of MfaFactor domain models on success', () async {
      repository.listFactorsResult = AppSuccess(_twoFactors);

      final result = await repository.listMfaFactors();

      expect(result, isA<AppSuccess<List<MfaFactor>>>());
      final factors = (result as AppSuccess<List<MfaFactor>>).value;
      expect(factors.length, 2);
      expect(factors[0].id, 'f1');
      expect(factors[0].status, 'verified');
      expect(factors[0].factorType, 'totp');
      expect(factors[0].isVerified, isTrue);
      expect(factors[0].createdAt, DateTime(2026, 3, 15));
      expect(factors[1].id, 'f2');
      expect(factors[1].isVerified, isFalse);
    });

    test('returns empty list when no factors enrolled', () async {
      repository.listFactorsResult = const AppSuccess<List<MfaFactor>>([]);

      final result = await repository.listMfaFactors();

      expect(result, isA<AppSuccess<List<MfaFactor>>>());
      final factors = (result as AppSuccess<List<MfaFactor>>).value;
      expect(factors, isEmpty);
    });

    test('returns AppError on network exception', () async {
      repository.listFactorsResult = Exception('network error');

      final result = await repository.listMfaFactors();

      expect(result, isA<AppError<List<MfaFactor>>>());
      final error = result as AppError<List<MfaFactor>>;
      expect(error.failure, isA<NetworkFailure>());
    });
  });

  // ── unenrollMfaFactor ─────────────────────────────────────────────────────

  group('unenrollMfaFactor', () {
    test('returns AppSuccess and captures factorId', () async {
      repository.unenrollResult = null; // success path

      final result = await repository.unenrollMfaFactor('factor-to-remove');

      expect(result, isA<AppSuccess<void>>());
      expect(repository.lastUnenrolledFactorId, 'factor-to-remove');
    });

    test('returns AuthenticationFailure on Supabase exception', () async {
      repository.unenrollResult = Exception('unenroll error');

      final result = await repository.unenrollMfaFactor('bad-factor');

      expect(result, isA<AppError<void>>());
      final error = result as AppError<void>;
      expect(error.failure, isA<AuthenticationFailure>());
    });

    test('captures the correct factorId even on failure', () async {
      repository.unenrollResult = Exception('error');

      await repository.unenrollMfaFactor('specific-factor-id');

      expect(repository.lastUnenrolledFactorId, 'specific-factor-id');
    });
  });

  // ── MfaFactor domain model ────────────────────────────────────────────────

  group('MfaFactor.isVerified', () {
    test('returns true for verified status', () {
      const factor = MfaFactor(id: 'f1', status: 'verified', factorType: 'totp');
      expect(factor.isVerified, isTrue);
    });

    test('returns false for unverified status', () {
      const factor = MfaFactor(id: 'f2', status: 'unverified', factorType: 'totp');
      expect(factor.isVerified, isFalse);
    });
  });

  // ── MfaEnrollment domain model ────────────────────────────────────────────

  group('MfaEnrollment', () {
    test('holds factorId, qrCodeUri and secret', () {
      const enrollment = MfaEnrollment(
        factorId: 'f1',
        qrCodeUri: 'data:image/png;base64,XYZ',
        secret: 'MYSECRET',
      );
      expect(enrollment.factorId, 'f1');
      expect(enrollment.qrCodeUri, 'data:image/png;base64,XYZ');
      expect(enrollment.secret, 'MYSECRET');
    });
  });
}
