/// Represents an enrolled MFA factor for the current user.
class MfaFactor {
  final String id;
  final String status; // 'verified' | 'unverified'
  final String factorType; // 'totp'
  final DateTime? createdAt;

  const MfaFactor({
    required this.id,
    required this.status,
    required this.factorType,
    this.createdAt,
  });

  bool get isVerified => status == 'verified';
}
