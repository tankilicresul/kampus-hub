class Workspace {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String permissionRole; // 'owner', 'admin', 'member', etc.
  final String? jobRole; // 'operations', 'marketing', etc.
  final String membershipStatus; // 'active', 'pending', etc.
  final DateTime? accessExpiresAt;
  final bool isLastActive;
  final bool requiresMfa;

  const Workspace({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    required this.permissionRole,
    this.jobRole,
    required this.membershipStatus,
    this.accessExpiresAt,
    required this.isLastActive,
    required this.requiresMfa,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['workspace_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      logoUrl: json['logo_url'] as String?,
      permissionRole: json['permission_role'] as String? ?? '',
      jobRole: json['job_role'] as String?,
      membershipStatus: json['membership_status'] as String? ?? '',
      accessExpiresAt: json['access_expires_at'] != null
          ? DateTime.tryParse(json['access_expires_at'] as String)
          : null,
      isLastActive: json['is_last_active'] as bool? ?? false,
      requiresMfa: json['requires_mfa'] as bool? ?? false,
    );
  }
}
