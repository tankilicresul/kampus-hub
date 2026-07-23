import '../../../../core/result/app_result.dart';
import '../models/daily_update_model.dart';

abstract class DailyUpdateRepository {
  Future<AppResult<List<DailyUpdateModel>>> getDailyUpdates(String workspaceId);
  Future<AppResult<DailyUpdateModel>> submitDailyUpdate(DailyUpdateModel update);
}
