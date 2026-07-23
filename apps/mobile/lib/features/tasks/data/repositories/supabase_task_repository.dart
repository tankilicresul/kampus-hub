import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/app_failure.dart';
import '../../../../core/errors/failure_mapper.dart';
import '../../../../core/result/app_result.dart';
import '../../domain/models/task_model.dart';
import '../../domain/repositories/task_repository.dart';

class SupabaseTaskRepository implements TaskRepository {
  final SupabaseClient _client;

  SupabaseTaskRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  @override
  Future<AppResult<List<TaskModel>>> getWorkspaceTasks(String workspaceId) async {
    try {
      final response = await _client
          .from('tasks')
          .select()
          .eq('workspace_id', workspaceId)
          .isFilter('deleted_at', null)
          .order('created_at', ascending: false);

      final tasks = (response as List<dynamic>)
          .map((json) => TaskModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return AppSuccess(tasks);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<TaskModel>> createTask(TaskModel task) async {
    try {
      final json = task.toJson();
      json.remove('id');

      final response = await _client
          .from('tasks')
          .insert(json)
          .select()
          .single();

      final created = TaskModel.fromJson(response);
      return AppSuccess(created);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<TaskModel>> updateTaskStatus({
    required String taskId,
    required String newStatus,
    String? waitingReason,
  }) async {
    try {
      if (newStatus == 'waiting' && (waitingReason == null || waitingReason.trim().isEmpty)) {
        return const AppError(ValidationFailure(
          userMessage: 'Beklemede durumu için bekleme nedeni belirtilmesi zorunludur.',
        ));
      }

      final updateData = <String, dynamic>{
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (newStatus == 'waiting') {
        updateData['waiting_reason'] = waitingReason;
      } else {
        updateData['waiting_reason'] = null;
      }

      final response = await _client
          .from('tasks')
          .update(updateData)
          .eq('id', taskId)
          .select()
          .single();

      final updated = TaskModel.fromJson(response);
      return AppSuccess(updated);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<void>> deleteTask(String taskId) async {
    try {
      await _client
          .from('tasks')
          .update({'deleted_at': DateTime.now().toIso8601String()})
          .eq('id', taskId);

      return const AppSuccess(null);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }
}
