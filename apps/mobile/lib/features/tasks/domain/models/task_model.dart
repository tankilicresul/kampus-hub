import 'package:flutter/foundation.dart';

@immutable
class TaskModel {
  final String id;
  final String? projectId;
  final String? universityId;
  final String? businessId;
  final String? workspaceId;
  final String title;
  final String? description;
  final String? primaryAssigneeId;
  final List<String> supporters;
  final DateTime? startDate;
  final DateTime? dueDate;
  final String priority; // 'low', 'normal', 'high', 'critical'
  final String status; // 'planned', 'todo', 'in_progress', 'waiting', 'review', 'revision_required', 'completed', 'cancelled'
  final int? effortScore;
  final bool completionEvidenceRequired;
  final String? completionEvidenceUrl;
  final String? waitingReason;
  final String? createdBy;
  final DateTime createdAt;

  const TaskModel({
    required this.id,
    this.projectId,
    this.universityId,
    this.businessId,
    this.workspaceId,
    required this.title,
    this.description,
    this.primaryAssigneeId,
    this.supporters = const [],
    this.startDate,
    this.dueDate,
    this.priority = 'normal',
    this.status = 'todo',
    this.effortScore,
    this.completionEvidenceRequired = false,
    this.completionEvidenceUrl,
    this.waitingReason,
    this.createdBy,
    required this.createdAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      projectId: json['project_id'] as String?,
      universityId: json['university_id'] as String?,
      businessId: json['business_id'] as String?,
      workspaceId: json['workspace_id'] as String?,
      title: json['title'] as String? ?? 'Untitled Task',
      description: json['description'] as String?,
      primaryAssigneeId: json['primary_assignee_id'] as String?,
      supporters: (json['supporters'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      startDate: json['start_date'] != null ? DateTime.parse(json['start_date'] as String) : null,
      dueDate: json['due_date'] != null ? DateTime.parse(json['due_date'] as String) : null,
      priority: json['priority'] as String? ?? 'normal',
      status: json['status'] as String? ?? 'todo',
      effortScore: json['effort_score'] as int?,
      completionEvidenceRequired: json['completion_evidence_required'] as bool? ?? false,
      completionEvidenceUrl: json['completion_evidence_url'] as String?,
      waitingReason: json['waiting_reason'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (projectId != null) 'project_id': projectId,
      if (universityId != null) 'university_id': universityId,
      if (businessId != null) 'business_id': businessId,
      if (workspaceId != null) 'workspace_id': workspaceId,
      'title': title,
      if (description != null) 'description': description,
      if (primaryAssigneeId != null) 'primary_assignee_id': primaryAssigneeId,
      'supporters': supporters,
      if (startDate != null) 'start_date': startDate!.toIso8601String().split('T').first,
      if (dueDate != null) 'due_date': dueDate!.toIso8601String().split('T').first,
      'priority': priority,
      'status': status,
      if (effortScore != null) 'effort_score': effortScore,
      'completion_evidence_required': completionEvidenceRequired,
      if (completionEvidenceUrl != null) 'completion_evidence_url': completionEvidenceUrl,
      if (waitingReason != null) 'waiting_reason': waitingReason,
      if (createdBy != null) 'created_by': createdBy,
    };
  }

  TaskModel copyWith({
    String? id,
    String? projectId,
    String? universityId,
    String? businessId,
    String? workspaceId,
    String? title,
    String? description,
    String? primaryAssigneeId,
    List<String>? supporters,
    DateTime? startDate,
    DateTime? dueDate,
    String? priority,
    String? status,
    int? effortScore,
    bool? completionEvidenceRequired,
    String? completionEvidenceUrl,
    String? waitingReason,
    String? createdBy,
    DateTime? createdAt,
  }) {
    return TaskModel(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      universityId: universityId ?? this.universityId,
      businessId: businessId ?? this.businessId,
      workspaceId: workspaceId ?? this.workspaceId,
      title: title ?? this.title,
      description: description ?? this.description,
      primaryAssigneeId: primaryAssigneeId ?? this.primaryAssigneeId,
      supporters: supporters ?? this.supporters,
      startDate: startDate ?? this.startDate,
      dueDate: dueDate ?? this.dueDate,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      effortScore: effortScore ?? this.effortScore,
      completionEvidenceRequired: completionEvidenceRequired ?? this.completionEvidenceRequired,
      completionEvidenceUrl: completionEvidenceUrl ?? this.completionEvidenceUrl,
      waitingReason: waitingReason ?? this.waitingReason,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
