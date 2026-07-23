import 'package:flutter_test/flutter_test.dart';
import 'package:kapindahub/core/result/app_result.dart';
import 'package:kapindahub/core/errors/app_failure.dart';
import 'package:kapindahub/features/workspace/domain/models/workspace.dart';
import 'package:kapindahub/features/workspace/domain/models/workspace_invitation.dart';
import 'package:kapindahub/features/workspace/domain/repositories/workspace_repository.dart';
import 'package:kapindahub/features/workspace/presentation/workspace_state_notifier.dart';

class _FakeWorkspaceRepository implements WorkspaceRepository {
  List<Workspace> workspaces = [];
  List<WorkspaceInvitation> invitations = [];
  bool throwError = false;
  String? acceptedId;
  String? declinedId;
  String? activeId;
  String? createdName;

  @override
  Future<AppResult<List<Workspace>>> listWorkspaces() async {
    if (throwError) {
      return const AppError(DatabaseFailure(technicalMessage: 'DB error'));
    }
    return AppSuccess(workspaces);
  }

  @override
  Future<AppResult<List<WorkspaceInvitation>>> listPendingInvitations() async {
    if (throwError) {
      return const AppError(DatabaseFailure(technicalMessage: 'DB error'));
    }
    return AppSuccess(invitations);
  }

  @override
  Future<AppResult<void>> acceptInvitation(String invitationId) async {
    acceptedId = invitationId;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> declineInvitation(String invitationId) async {
    declinedId = invitationId;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> createWorkspace({
    required String name,
    required String slug,
    required String industry,
  }) async {
    createdName = name;
    return const AppSuccess(null);
  }

  @override
  Future<AppResult<void>> setActiveWorkspace(String workspaceId) async {
    activeId = workspaceId;
    return const AppSuccess(null);
  }
}

void main() {
  group('WorkspaceStateNotifier Unit Tests', () {
    late _FakeWorkspaceRepository repo;
    late WorkspaceStateNotifier notifier;

    setUp(() {
      repo = _FakeWorkspaceRepository();
      notifier = WorkspaceStateNotifier(repo);
    });

    test('initial state is WorkspaceStatus.initial', () {
      expect(notifier.state.status, WorkspaceStatus.initial);
      expect(notifier.state.workspaces, isEmpty);
      expect(notifier.state.invitations, isEmpty);
      expect(notifier.state.activeWorkspace, isNull);
    });

    test('loadWorkspaceData successfully loads workspaces and invitations', () async {
      repo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true,
          requiresMfa: false,
        )
      ];
      repo.invitations = [
        WorkspaceInvitation(
          id: 'inv-1',
          workspaceName: 'WS 2',
          permissionRole: 'member',
          jobRole: 'operations',
          universityScopes: const [],
          createdAt: DateTime.now(),
        )
      ];

      await notifier.loadWorkspaceData();

      expect(notifier.state.status, WorkspaceStatus.loaded);
      expect(notifier.state.workspaces.length, 1);
      expect(notifier.state.invitations.length, 1);
      expect(notifier.state.activeWorkspace?.id, 'ws-1');
    });

    test('loadWorkspaceData auto-selects active workspace if single and none is active', () async {
      repo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: false, // Not active initially
          requiresMfa: false,
        )
      ];

      await notifier.loadWorkspaceData();

      expect(notifier.state.status, WorkspaceStatus.loaded);
      expect(notifier.state.activeWorkspace?.id, 'ws-1');
      expect(repo.activeId, 'ws-1');
    });

    test('loadWorkspaceData sets error state on repository failure', () async {
      repo.throwError = true;

      await notifier.loadWorkspaceData();

      expect(notifier.state.status, WorkspaceStatus.error);
      expect(notifier.state.error, contains('veri hatası'));
    });

    test('selectWorkspace updates active workspace and reloads', () async {
      repo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: false,
          requiresMfa: false,
        ),
        const Workspace(
          id: 'ws-2',
          name: 'WS 2',
          slug: 'ws-2',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true, // Initially ws-2 is active
          requiresMfa: false,
        )
      ];

      await notifier.loadWorkspaceData();
      expect(notifier.state.activeWorkspace?.id, 'ws-2');

      // Now choose ws-1, and mock repository active status update
      repo.workspaces = [
        const Workspace(
          id: 'ws-1',
          name: 'WS 1',
          slug: 'ws-1',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: true, // Now ws-1 is active in DB
          requiresMfa: false,
        ),
        const Workspace(
          id: 'ws-2',
          name: 'WS 2',
          slug: 'ws-2',
          permissionRole: 'member',
          membershipStatus: 'active',
          isLastActive: false,
          requiresMfa: false,
        )
      ];

      final res = await notifier.selectWorkspace('ws-1');
      expect(res.isSuccess, isTrue);
      expect(repo.activeId, 'ws-1');
      expect(notifier.state.activeWorkspace?.id, 'ws-1');
    });
  });
}
