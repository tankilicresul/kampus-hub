class WorkspaceInvitation {
  final String id;
  final String workspaceName;
  final String? workspaceLogo;
  final String? invitedByName;
  final String permissionRole;
  final String jobRole;
  final String? customJobRole;
  final String? department;
  final List<Map<String, dynamic>> universityScopes;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final DateTime? accessExpiresAt;

  const WorkspaceInvitation({
    required this.id,
    required this.workspaceName,
    this.workspaceLogo,
    this.invitedByName,
    required this.permissionRole,
    required this.jobRole,
    this.customJobRole,
    this.department,
    required this.universityScopes,
    required this.createdAt,
    this.expiresAt,
    this.accessExpiresAt,
  });

  factory WorkspaceInvitation.fromJson(Map<String, dynamic> json) {
    var scopesList = <Map<String, dynamic>>[];
    if (json['university_scopes'] != null) {
      if (json['university_scopes'] is List) {
        scopesList = List<Map<String, dynamic>>.from(
          (json['university_scopes'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
        );
      }
    }

    return WorkspaceInvitation(
      id: json['invitation_id'] as String? ?? json['id'] as String? ?? '',
      workspaceName: json['workspace_name'] as String? ?? '',
      workspaceLogo: json['workspace_logo'] as String?,
      invitedByName: json['invited_by_name'] as String?,
      permissionRole: json['permission_role'] as String? ?? '',
      jobRole: json['job_role'] as String? ?? '',
      customJobRole: json['custom_job_role'] as String?,
      department: json['department'] as String?,
      universityScopes: scopesList,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'] as String)
          : null,
      accessExpiresAt: json['access_expires_at'] != null
          ? DateTime.tryParse(json['access_expires_at'] as String)
          : null,
    );
  }
}
