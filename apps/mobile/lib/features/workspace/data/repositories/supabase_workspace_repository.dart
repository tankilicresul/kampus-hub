import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kampushub/core/logging/app_logger.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/core/errors/app_failure.dart';
import 'package:kampushub/core/errors/failure_mapper.dart';
import 'package:kampushub/core/async/operation_class.dart';
import 'package:kampushub/core/async/retry_policy.dart';
import 'package:kampushub/core/async/timeout_policy.dart';
import '../../domain/models/workspace.dart';
import '../../domain/models/workspace_invitation.dart';
import '../../domain/repositories/workspace_repository.dart';

final class SupabaseWorkspaceRepository implements WorkspaceRepository {
  final SupabaseClient supabase;
  final AppLogger logger;

  const SupabaseWorkspaceRepository(
    this.supabase, {
    this.logger = const NoopAppLogger(),
  });

  @override
  Future<AppResult<List<Workspace>>> listWorkspaces() async {
    const op = OperationClass.safeRead;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc('list_current_user_workspaces')
            .timeout(timeout);

        if (response is! List) {
          throw const DatabaseFailure(
            technicalMessage: 'list_current_user_workspaces RPC did not return a List',
          );
        }

        final workspaces = response
            .map((e) => Workspace.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();

        return AppSuccess(workspaces);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'listWorkspaces attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'listWorkspaces final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<List<WorkspaceInvitation>>> listPendingInvitations() async {
    const op = OperationClass.safeRead;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc('list_current_user_pending_workspace_invitations')
            .timeout(timeout);

        if (response is! List) {
          throw const DatabaseFailure(
            technicalMessage:
                'list_current_user_pending_workspace_invitations RPC did not return a List',
          );
        }

        final invitations = response
            .map((e) => WorkspaceInvitation.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();

        return AppSuccess(invitations);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'listPendingInvitations attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'listPendingInvitations final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> acceptInvitation(String invitationId) async {
    const op = OperationClass.idempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc(
              'accept_current_user_workspace_invitation',
              params: {'p_invitation_id': invitationId},
            )
            .timeout(timeout);

        if (response is Map) {
          final success = response['success'] as bool? ?? false;
          if (!success) {
            final msg = response['message'] as String? ?? 'Invitation accept failed';
            throw DatabaseFailure(technicalMessage: msg);
          }
        }

        return const AppSuccess(null);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'acceptInvitation attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'acceptInvitation final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> declineInvitation(String invitationId) async {
    const op = OperationClass.idempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc(
              'decline_current_user_workspace_invitation',
              params: {'p_invitation_id': invitationId},
            )
            .timeout(timeout);

        if (response is Map) {
          final success = response['success'] as bool? ?? false;
          if (!success) {
            final msg = response['message'] as String? ?? 'Invitation decline failed';
            throw DatabaseFailure(technicalMessage: msg);
          }
        }

        return const AppSuccess(null);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'declineInvitation attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'declineInvitation final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> createWorkspace({
    required String name,
    required String slug,
    required String industry,
  }) async {
    const op = OperationClass.nonIdempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc(
              'create_workspace_with_owner',
              params: {
                'workspace_name': name,
                'requested_slug': slug,
                'industry': industry,
              },
            )
            .timeout(timeout);

        if (response is Map) {
          final success = response['success'] as bool? ?? false;
          if (!success) {
            final msg = response['message'] as String? ?? 'Workspace creation failed';
            throw DatabaseFailure(technicalMessage: msg);
          }
        }

        return const AppSuccess(null);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'createWorkspace attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'createWorkspace final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }

  @override
  Future<AppResult<void>> setActiveWorkspace(String workspaceId) async {
    const op = OperationClass.idempotentWrite;
    final timeout = TimeoutPolicy.defaults.forOperation(op);
    int attemptCount = 1;

    while (true) {
      try {
        final response = await supabase
            .rpc(
              'set_current_user_active_workspace',
              params: {'p_target_workspace_id': workspaceId},
            )
            .timeout(timeout);

        if (response is Map) {
          final success = response['success'] as bool? ?? false;
          if (!success) {
            final msg = response['message'] as String? ?? 'Setting active workspace failed';
            throw DatabaseFailure(technicalMessage: msg);
          }
        }

        return const AppSuccess(null);
      } catch (e, st) {
        final failure = FailureMapper.map(e, stackTrace: st);
        final context = RetryContext(
          operationClass: op,
          attemptCount: attemptCount,
          maxAttempts: RetryPolicy.maxAttemptsFor(op),
        );
        final decision = RetryPolicy.evaluate(failure: failure, context: context);

        if (decision.action == RetryAction.retry && decision.delay != null) {
          logger.warning(
            'setActiveWorkspace attempt $attemptCount failed. Retrying...',
            error: e,
          );
          await Future<void>.delayed(decision.delay!);
          attemptCount++;
        } else {
          logger.error(
            'setActiveWorkspace final failure after $attemptCount attempts',
            error: e,
            stackTrace: st,
          );
          return AppError(failure);
        }
      }
    }
  }
}
