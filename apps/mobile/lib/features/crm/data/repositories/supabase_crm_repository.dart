import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failure_mapper.dart';
import '../../../../core/result/app_result.dart';
import '../../domain/models/crm_business_model.dart';
import '../../domain/repositories/crm_repository.dart';

class SupabaseCrmRepository implements CrmRepository {
  final SupabaseClient _client;

  SupabaseCrmRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  @override
  Future<AppResult<List<CrmBusinessModel>>> getWorkspaceBusinesses(String workspaceId) async {
    try {
      final response = await _client
          .from('businesses')
          .select()
          .eq('workspace_id', workspaceId)
          .isFilter('deleted_at', null)
          .order('created_at', ascending: false);

      final businesses = (response as List<dynamic>)
          .map((json) => CrmBusinessModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return AppSuccess(businesses);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<CrmBusinessModel>> createBusiness(CrmBusinessModel business) async {
    try {
      final json = business.toJson();
      json.remove('id');

      if (json['university_id'] == null) {
        final uniList = await _client
            .from('universities')
            .select('id')
            .limit(1);
        if (uniList is List && uniList.isNotEmpty) {
          json['university_id'] = uniList.first['id'];
        }
      }

      final response = await _client
          .from('businesses')
          .insert(json)
          .select()
          .single();

      final created = CrmBusinessModel.fromJson(response);
      return AppSuccess(created);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<CrmBusinessModel>> updateStage({
    required String businessId,
    required String newStage,
  }) async {
    try {
      final response = await _client
          .from('businesses')
          .update({
            'stage': newStage,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', businessId)
          .select()
          .single();

      final updated = CrmBusinessModel.fromJson(response);
      return AppSuccess(updated);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }
}
