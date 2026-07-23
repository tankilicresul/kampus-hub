import 'package:flutter/foundation.dart';

@immutable
class DailyUpdateModel {
  final String id;
  final String userId;
  final String? workspaceId;
  final String completedToday;
  final String ongoingWork;
  final String? blockers;
  final String? supportNeeded;
  final String tomorrowPlan;
  final List<String> relatedTasks;
  final String? additionalNotes;
  final String status; // 'draft', 'published'
  final bool isLate;
  final DateTime createdAt;

  const DailyUpdateModel({
    required this.id,
    required this.userId,
    this.workspaceId,
    required this.completedToday,
    required this.ongoingWork,
    this.blockers,
    this.supportNeeded,
    required this.tomorrowPlan,
    this.relatedTasks = const [],
    this.additionalNotes,
    this.status = 'draft',
    this.isLate = false,
    required this.createdAt,
  });

  factory DailyUpdateModel.fromJson(Map<String, dynamic> json) {
    return DailyUpdateModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      workspaceId: json['workspace_id'] as String?,
      completedToday: json['completed_today'] as String? ?? '',
      ongoingWork: json['ongoing_work'] as String? ?? '',
      blockers: json['blockers'] as String?,
      supportNeeded: json['support_needed'] as String?,
      tomorrowPlan: json['tomorrow_plan'] as String? ?? '',
      relatedTasks: (json['related_tasks'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      additionalNotes: json['additional_notes'] as String?,
      status: json['status'] as String? ?? 'draft',
      isLate: json['is_late'] as bool? ?? false,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      if (workspaceId != null) 'workspace_id': workspaceId,
      'completed_today': completedToday,
      'ongoing_work': ongoingWork,
      if (blockers != null) 'blockers': blockers,
      if (supportNeeded != null) 'support_needed': supportNeeded,
      'tomorrow_plan': tomorrowPlan,
      'related_tasks': relatedTasks,
      if (additionalNotes != null) 'additional_notes': additionalNotes,
      'status': status,
      'is_late': isLate,
    };
  }
}
