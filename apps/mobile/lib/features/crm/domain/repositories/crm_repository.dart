import '../../../../core/result/app_result.dart';
import '../models/crm_business_model.dart';

abstract class CrmRepository {
  Future<AppResult<List<CrmBusinessModel>>> getWorkspaceBusinesses(String workspaceId);
  Future<AppResult<CrmBusinessModel>> createBusiness(CrmBusinessModel business);
  Future<AppResult<CrmBusinessModel>> updateStage({
    required String businessId,
    required String newStage,
  });
}
