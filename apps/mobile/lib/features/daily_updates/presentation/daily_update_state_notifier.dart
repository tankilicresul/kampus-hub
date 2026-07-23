import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/daily_update_model.dart';
import '../domain/repositories/daily_update_repository.dart';
import '../data/repositories/supabase_daily_update_repository.dart';

final dailyUpdateRepositoryProvider = Provider<DailyUpdateRepository>((ref) {
  return SupabaseDailyUpdateRepository();
});

@immutable
class DailyUpdateState {
  final List<DailyUpdateModel> updates;
  final bool isLoading;
  final String? errorMessage;

  const DailyUpdateState({
    this.updates = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  DailyUpdateState copyWith({
    List<DailyUpdateModel>? updates,
    bool? isLoading,
    String? errorMessage,
  }) {
    return DailyUpdateState(
      updates: updates ?? this.updates,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class DailyUpdateStateNotifier extends StateNotifier<DailyUpdateState> {
  final DailyUpdateRepository _repository;

  DailyUpdateStateNotifier(this._repository) : super(const DailyUpdateState());

  Future<void> loadDailyUpdates(String workspaceId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final result = await _repository.getDailyUpdates(workspaceId);

    result.when(
      success: (updates) {
        state = state.copyWith(updates: updates, isLoading: false);
      },
      error: (failure) {
        state = state.copyWith(
          errorMessage: failure.userMessage,
          isLoading: false,
        );
      },
    );
  }

  Future<bool> submitUpdate(DailyUpdateModel update) async {
    final result = await _repository.submitDailyUpdate(update);

    return result.when(
      success: (createdUpdate) {
        state = state.copyWith(updates: [createdUpdate, ...state.updates]);
        return true;
      },
      error: (failure) {
        state = state.copyWith(errorMessage: failure.userMessage);
        return false;
      },
    );
  }
}

final dailyUpdateStateProvider =
    StateNotifierProvider<DailyUpdateStateNotifier, DailyUpdateState>((ref) {
  final repository = ref.watch(dailyUpdateRepositoryProvider);
  return DailyUpdateStateNotifier(repository);
});
