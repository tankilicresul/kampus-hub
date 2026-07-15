import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import '../domain/models/workspace.dart';
import '../domain/models/workspace_invitation.dart';
import '../domain/repositories/workspace_repository.dart';
import '../di/workspace_dependencies.dart';

enum WorkspaceStatus {
  initial,
  loading,
  loaded,
  error,
}

class WorkspaceState {
  final WorkspaceStatus status;
  final List<Workspace> workspaces;
  final List<WorkspaceInvitation> invitations;
  final Workspace? activeWorkspace;
  final String? error;

  WorkspaceState({
    required this.status,
    this.workspaces = const [],
    this.invitations = const [],
    this.activeWorkspace,
    this.error,
  });

  WorkspaceState copyWith({
    WorkspaceStatus? status,
    List<Workspace>? workspaces,
    List<WorkspaceInvitation>? invitations,
    Workspace? activeWorkspace,
    String? error,
    bool clearActiveWorkspace = false,
    bool clearError = false,
  }) {
    return WorkspaceState(
      status: status ?? this.status,
      workspaces: workspaces ?? this.workspaces,
      invitations: invitations ?? this.invitations,
      activeWorkspace: clearActiveWorkspace ? null : (activeWorkspace ?? this.activeWorkspace),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class WorkspaceStateNotifier extends StateNotifier<WorkspaceState> {
  final WorkspaceRepository workspaceRepository;

  WorkspaceStateNotifier(this.workspaceRepository)
      : super(WorkspaceState(status: WorkspaceStatus.initial));

  void clear() {
    state = WorkspaceState(status: WorkspaceStatus.initial);
  }

  Future<void> loadWorkspaceData() async {
    if (!mounted) return;
    state = state.copyWith(status: WorkspaceStatus.loading, clearError: true);

    final workspacesRes = await workspaceRepository.listWorkspaces();
    final invitationsRes = await workspaceRepository.listPendingInvitations();

    if (!mounted) return;

    if (workspacesRes is AppError<List<Workspace>>) {
      state = state.copyWith(
        status: WorkspaceStatus.error,
        error: workspacesRes.failure.userMessage,
      );
      return;
    }

    if (invitationsRes is AppError<List<WorkspaceInvitation>>) {
      state = state.copyWith(
        status: WorkspaceStatus.error,
        error: invitationsRes.failure.userMessage,
      );
      return;
    }

    final workspaces = (workspacesRes as AppSuccess<List<Workspace>>).value;
    final invitations = (invitationsRes as AppSuccess<List<WorkspaceInvitation>>).value;

    Workspace? active;
    // Find active workspace from DB marker
    for (final w in workspaces) {
      if (w.isLastActive) {
        active = w;
        break;
      }
    }

    // If no active workspace is marked, but there is exactly 1 workspace, auto-select it
    if (active == null && workspaces.length == 1) {
      final singleWorkspace = workspaces.first;
      final setActiveRes = await workspaceRepository.setActiveWorkspace(singleWorkspace.id);
      if (!mounted) return;
      if (setActiveRes is AppSuccess<void>) {
        active = singleWorkspace.copyWith(isLastActive: true);
        // Replace list item with updated active status
        workspaces[0] = active;
      }
    }

    if (!mounted) return;
    state = WorkspaceState(
      status: WorkspaceStatus.loaded,
      workspaces: workspaces,
      invitations: invitations,
      activeWorkspace: active,
    );
  }

  Future<AppResult<void>> selectWorkspace(String workspaceId) async {
    final res = await workspaceRepository.setActiveWorkspace(workspaceId);
    if (res is AppSuccess<void>) {
      await loadWorkspaceData();
    }
    return res;
  }

  Future<AppResult<void>> acceptInvite(String invitationId) async {
    final res = await workspaceRepository.acceptInvitation(invitationId);
    if (res is AppSuccess<void>) {
      await loadWorkspaceData();
    }
    return res;
  }

  Future<AppResult<void>> declineInvite(String invitationId) async {
    final res = await workspaceRepository.declineInvitation(invitationId);
    if (res is AppSuccess<void>) {
      await loadWorkspaceData();
    }
    return res;
  }

  Future<AppResult<void>> createNewWorkspace({
    required String name,
    required String slug,
    required String industry,
  }) async {
    final res = await workspaceRepository.createWorkspace(
      name: name,
      slug: slug,
      industry: industry,
    );
    if (res is AppSuccess<void>) {
      await loadWorkspaceData();
    }
    return res;
  }
}

// Extension to allow copyWith on Workspace list items
extension WorkspaceCopy on Workspace {
  Workspace copyWith({
    String? id,
    String? name,
    String? slug,
    String? logoUrl,
    String? permissionRole,
    String? jobRole,
    String? membershipStatus,
    DateTime? accessExpiresAt,
    bool? isLastActive,
    bool? requiresMfa,
  }) {
    return Workspace(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      logoUrl: logoUrl ?? this.logoUrl,
      permissionRole: permissionRole ?? this.permissionRole,
      jobRole: jobRole ?? this.jobRole,
      membershipStatus: membershipStatus ?? this.membershipStatus,
      accessExpiresAt: accessExpiresAt ?? this.accessExpiresAt,
      isLastActive: isLastActive ?? this.isLastActive,
      requiresMfa: requiresMfa ?? this.requiresMfa,
    );
  }
}

// Provider definition with automatic auth synchronization
final workspaceStateProvider =
    StateNotifierProvider<WorkspaceStateNotifier, WorkspaceState>((ref) {
  final repo = ref.watch(workspaceRepositoryProvider);
  final authState = ref.watch(authStateProvider);

  final notifier = WorkspaceStateNotifier(repo);

  if (authState.status == AuthStatus.unauthenticated) {
    Future.microtask(() {
      if (notifier.mounted) {
        notifier.clear();
      }
    });
  } else if (authState.status == AuthStatus.authenticated) {
    Future.microtask(() {
      if (notifier.mounted) {
        notifier.loadWorkspaceData();
      }
    });
  }

  return notifier;
});
