import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failure_mapper.dart';
import '../../../../core/result/app_result.dart';
import '../../domain/models/daily_update_model.dart';
import '../../domain/repositories/daily_update_repository.dart';

class SupabaseDailyUpdateRepository implements DailyUpdateRepository {
  final SupabaseClient _client;

  SupabaseDailyUpdateRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  @override
  Future<AppResult<List<DailyUpdateModel>>> getDailyUpdates(String workspaceId) async {
    try {
      final response = await _client
          .from('daily_updates')
          .select()
          .eq('workspace_id', workspaceId)
          .order('created_at', ascending: false);

      final updates = (response as List<dynamic>)
          .map((json) => DailyUpdateModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return AppSuccess(updates);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }

  @override
  Future<AppResult<DailyUpdateModel>> submitDailyUpdate(DailyUpdateModel update) async {
    try {
      final json = update.toJson();
      json.remove('id');

      final now = DateTime.now();
      if (now.hour >= 20) {
        json['is_late'] = true;
      }

      final response = await _client
          .from('daily_updates')
          .insert(json)
          .select()
          .single();

      final created = DailyUpdateModel.fromJson(response);
      return AppSuccess(created);
    } catch (e, stackTrace) {
      return AppError(FailureMapper.map(e, stackTrace: stackTrace));
    }
  }
}
