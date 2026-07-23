import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/models/crm_business_model.dart';
import '../domain/repositories/crm_repository.dart';
import '../data/repositories/supabase_crm_repository.dart';

final crmRepositoryProvider = Provider<CrmRepository>((ref) {
  return SupabaseCrmRepository();
});

@immutable
class CrmState {
  final List<CrmBusinessModel> businesses;
  final bool isLoading;
  final String? errorMessage;

  const CrmState({
    this.businesses = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  CrmState copyWith({
    List<CrmBusinessModel>? businesses,
    bool? isLoading,
    String? errorMessage,
  }) {
    return CrmState(
      businesses: businesses ?? this.businesses,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class CrmStateNotifier extends StateNotifier<CrmState> {
  final CrmRepository _repository;

  CrmStateNotifier(this._repository) : super(const CrmState());

  Future<void> loadBusinesses(String workspaceId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final result = await _repository.getWorkspaceBusinesses(workspaceId);

    result.when(
      success: (businesses) {
        state = state.copyWith(businesses: businesses, isLoading: false);
      },
      error: (failure) {
        state = state.copyWith(
          errorMessage: failure.userMessage,
          isLoading: false,
        );
      },
    );
  }

  Future<bool> createBusiness(CrmBusinessModel business) async {
    final result = await _repository.createBusiness(business);

    return result.when(
      success: (created) {
        state = state.copyWith(businesses: [created, ...state.businesses]);
        return true;
      },
      error: (failure) {
        state = state.copyWith(errorMessage: failure.userMessage);
        return false;
      },
    );
  }

  Future<bool> updateStage(String businessId, String newStage) async {
    final result = await _repository.updateStage(
      businessId: businessId,
      newStage: newStage,
    );

    return result.when(
      success: (updated) {
        final list = state.businesses.map((b) => b.id == businessId ? updated : b).toList();
        state = state.copyWith(businesses: list);
        return true;
      },
      error: (failure) {
        state = state.copyWith(errorMessage: failure.userMessage);
        return false;
      },
    );
  }
}

final crmStateProvider = StateNotifierProvider<CrmStateNotifier, CrmState>((ref) {
  final repository = ref.watch(crmRepositoryProvider);
  return CrmStateNotifier(repository);
});
