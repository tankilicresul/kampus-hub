import 'package:kampushub/core/result/app_result.dart';
import '../models/workspace.dart';
import '../models/workspace_invitation.dart';

abstract interface class WorkspaceRepository {
  Future<AppResult<List<Workspace>>> listWorkspaces();
  Future<AppResult<List<WorkspaceInvitation>>> listPendingInvitations();
  Future<AppResult<void>> acceptInvitation(String invitationId);
  Future<AppResult<void>> declineInvitation(String invitationId);
  Future<AppResult<void>> createWorkspace({
    required String name,
    required String slug,
    required String industry,
  });
  Future<AppResult<void>> setActiveWorkspace(String workspaceId);
}
