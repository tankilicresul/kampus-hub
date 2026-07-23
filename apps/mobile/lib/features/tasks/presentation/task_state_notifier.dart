import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/task_model.dart';
import '../domain/repositories/task_repository.dart';
import '../data/repositories/supabase_task_repository.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return SupabaseTaskRepository();
});

enum TaskViewMode { kanban, list }

@immutable
class TaskState {
  final List<TaskModel> tasks;
  final bool isLoading;
  final String? errorMessage;
  final TaskViewMode viewMode;
  final String selectedStatusFilter; // 'all', 'todo', etc.

  const TaskState({
    this.tasks = const [],
    this.isLoading = false,
    this.errorMessage,
    this.viewMode = TaskViewMode.kanban,
    this.selectedStatusFilter = 'all',
  });

  TaskState copyWith({
    List<TaskModel>? tasks,
    bool? isLoading,
    String? errorMessage,
    TaskViewMode? viewMode,
    String? selectedStatusFilter,
  }) {
    return TaskState(
      tasks: tasks ?? this.tasks,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      viewMode: viewMode ?? this.viewMode,
      selectedStatusFilter: selectedStatusFilter ?? this.selectedStatusFilter,
    );
  }
}

class TaskStateNotifier extends StateNotifier<TaskState> {
  final TaskRepository _repository;

  TaskStateNotifier(this._repository) : super(const TaskState());

  Future<void> loadWorkspaceTasks(String workspaceId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final result = await _repository.getWorkspaceTasks(workspaceId);

    result.when(
      success: (tasks) {
        state = state.copyWith(tasks: tasks, isLoading: false);
      },
      error: (failure) {
        state = state.copyWith(
          errorMessage: failure.userMessage,
          isLoading: false,
        );
      },
    );
  }

  Future<bool> updateStatus({
    required String taskId,
    required String newStatus,
    String? waitingReason,
  }) async {
    final result = await _repository.updateTaskStatus(
      taskId: taskId,
      newStatus: newStatus,
      waitingReason: waitingReason,
    );

    return result.when(
      success: (updatedTask) {
        final updatedList = state.tasks.map((t) => t.id == taskId ? updatedTask : t).toList();
        state = state.copyWith(tasks: updatedList);
        return true;
      },
      error: (failure) {
        state = state.copyWith(errorMessage: failure.userMessage);
        return false;
      },
    );
  }

  Future<bool> createNewTask(TaskModel task) async {
    final result = await _repository.createTask(task);

    return result.when(
      success: (createdTask) {
        state = state.copyWith(tasks: [createdTask, ...state.tasks]);
        return true;
      },
      error: (failure) {
        state = state.copyWith(errorMessage: failure.userMessage);
        return false;
      },
    );
  }

  void toggleViewMode() {
    final nextMode = state.viewMode == TaskViewMode.kanban
        ? TaskViewMode.list
        : TaskViewMode.kanban;
    state = state.copyWith(viewMode: nextMode);
  }

  void setStatusFilter(String filter) {
    state = state.copyWith(selectedStatusFilter: filter);
  }
}

final taskStateProvider = StateNotifierProvider<TaskStateNotifier, TaskState>((ref) {
  final repository = ref.watch(taskRepositoryProvider);
  return TaskStateNotifier(repository);
});
