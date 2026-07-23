import 'package:flutter/foundation.dart';

@immutable
class CrmBusinessModel {
  final String id;
  final String? universityId;
  final String? workspaceId;
  final String name;
  final String stage; // 'discovered', 'visit_planned', 'contacted', 'agreement_reached', 'contract_completed', 'active', 'rejected'
  final String? authorizedPersonName;
  final String? authorizedPersonPhone;
  final String? authorizedPersonEmail;
  final String? meetingNotes;
  final DateTime? nextFollowupDate;
  final String? assignedUserId;
  final double commissionRate;
  final DateTime createdAt;

  const CrmBusinessModel({
    required this.id,
    this.universityId,
    this.workspaceId,
    required this.name,
    this.stage = 'discovered',
    this.authorizedPersonName,
    this.authorizedPersonPhone,
    this.authorizedPersonEmail,
    this.meetingNotes,
    this.nextFollowupDate,
    this.assignedUserId,
    this.commissionRate = 0.0,
    required this.createdAt,
  });

  factory CrmBusinessModel.fromJson(Map<String, dynamic> json) {
    return CrmBusinessModel(
      id: json['id'] as String,
      universityId: json['university_id'] as String?,
      workspaceId: json['workspace_id'] as String?,
      name: json['name'] as String? ?? 'Untitled Business',
      stage: json['stage'] as String? ?? 'discovered',
      authorizedPersonName: json['authorized_person_name'] as String?,
      authorizedPersonPhone: json['authorized_person_phone'] as String?,
      authorizedPersonEmail: json['authorized_person_email'] as String?,
      meetingNotes: json['meeting_notes'] as String?,
      nextFollowupDate: json['next_followup_date'] != null
          ? DateTime.parse(json['next_followup_date'] as String)
          : null,
      assignedUserId: json['assigned_user_id'] as String?,
      commissionRate: (json['commission_rate'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (universityId != null) 'university_id': universityId,
      if (workspaceId != null) 'workspace_id': workspaceId,
      'name': name,
      'stage': stage,
      if (authorizedPersonName != null) 'authorized_person_name': authorizedPersonName,
      if (authorizedPersonPhone != null) 'authorized_person_phone': authorizedPersonPhone,
      if (authorizedPersonEmail != null) 'authorized_person_email': authorizedPersonEmail,
      if (meetingNotes != null) 'meeting_notes': meetingNotes,
      if (nextFollowupDate != null) 'next_followup_date': nextFollowupDate!.toIso8601String().split('T').first,
      if (assignedUserId != null) 'assigned_user_id': assignedUserId,
      'commission_rate': commissionRate,
    };
  }
}
