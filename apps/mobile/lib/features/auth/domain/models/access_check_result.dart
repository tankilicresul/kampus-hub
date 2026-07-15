final class AccessCheckResult {
  final bool allowed;
  final String reason;
  final String? role;
  final String? universityId;

  const AccessCheckResult({
    required this.allowed,
    required this.reason,
    this.role,
    this.universityId,
  });
}
