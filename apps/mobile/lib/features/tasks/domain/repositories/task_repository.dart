import '../../../../core/result/app_result.dart';
import '../models/task_model.dart';

abstract class TaskRepository {
  Future<AppResult<List<TaskModel>>> getWorkspaceTasks(String workspaceId);
  Future<AppResult<TaskModel>> createTask(TaskModel task);
  Future<AppResult<TaskModel>> updateTaskStatus({
    required String taskId,
    required String newStatus,
    String? waitingReason,
  });
  Future<AppResult<void>> deleteTask(String taskId);
}
