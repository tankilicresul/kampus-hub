import 'dart:async';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kampushub/core/logging/app_logger.dart';
import 'package:kampushub/features/workspace/data/repositories/supabase_workspace_repository.dart';

class FakePostgrestFilterBuilder<T> implements PostgrestFilterBuilder<T> {
  final Future<T> _future;

  FakePostgrestFilterBuilder(this._future);

  @override
  Future<R> then<R>(FutureOr<R> Function(T value) onValue, {Function? onError}) {
    return _future.then(onValue, onError: onError);
  }

  @override
  Future<T> catchError(Function onError, {bool Function(Object error)? test}) {
    return _future.catchError(onError, test: test);
  }

  @override
  Future<T> whenComplete(FutureOr<void> Function() action) {
    return _future.whenComplete(action);
  }

  @override
  Stream<T> asStream() {
    return _future.asStream();
  }

  @override
  Future<T> timeout(Duration timeLimit, {FutureOr<T> Function()? onTimeout}) {
    return _future.timeout(timeLimit, onTimeout: onTimeout);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeSupabaseClient implements SupabaseClient {
  Future<dynamic> Function(String fn, Map<String, dynamic>? params)? onRpc;

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #rpc) {
      final fn = invocation.positionalArguments[0] as String;
      final params = invocation.namedArguments[#params] as Map<String, dynamic>?;
      final Future<dynamic> future = onRpc != null
          ? onRpc!(fn, params)
          : Future.value(null);
      return FakePostgrestFilterBuilder(future);
    }
    return super.noSuchMethod(invocation);
  }
}

class FakeAppLogger implements AppLogger {
  final List<String> logs = [];

  @override
  void debug(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('DEBUG: $message');
  }

  @override
  void info(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('INFO: $message');
  }

  @override
  void warning(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('WARNING: $message');
  }

  @override
  void error(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('ERROR: $message');
  }

  @override
  void critical(String message, {Map<String, Object?>? context, Object? error, StackTrace? stackTrace}) {
    logs.add('CRITICAL: $message');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SupabaseWorkspaceRepository Unit Tests', () {
    late FakeSupabaseClient client;
    late FakeAppLogger logger;
    late SupabaseWorkspaceRepository repo;

    setUp(() {
      client = FakeSupabaseClient();
      logger = FakeAppLogger();
      repo = SupabaseWorkspaceRepository(client, logger: logger);
    });

    test('listWorkspaces parses rows correctly', () async {
      client.onRpc = (fn, params) async {
        expect(fn, 'list_current_user_workspaces');
        return [
          {
            'workspace_id': 'uuid-1',
            'name': 'Workspace 1',
            'slug': 'workspace-1',
            'logo_url': 'logo-url',
            'permission_role': 'admin',
            'job_role': 'operations',
            'membership_status': 'active',
            'access_expires_at': '2026-07-12T00:00:00Z',
            'is_last_active': true,
            'requires_mfa': false,
          }
        ];
      };

      final res = await repo.listWorkspaces();
      expect(res.isSuccess, isTrue);
      final list = res.valueOrNull!;
      expect(list.length, 1);
      expect(list.first.id, 'uuid-1');
      expect(list.first.name, 'Workspace 1');
      expect(list.first.isLastActive, isTrue);
    });

    test('listPendingInvitations parses rows correctly', () async {
      client.onRpc = (fn, params) async {
        expect(fn, 'list_current_user_pending_workspace_invitations');
        return [
          {
            'invitation_id': 'inv-1',
            'workspace_name': 'WS Name',
            'workspace_logo': 'logo',
            'invited_by_name': 'Inviter',
            'permission_role': 'member',
            'job_role': 'marketing',
            'custom_job_role': null,
            'department': 'Marketing',
            'university_scopes': [
              {'id': 'uni-1', 'name': 'Uni 1'}
            ],
            'created_at': '2026-07-12T00:00:00Z',
            'expires_at': null,
            'access_expires_at': null,
          }
        ];
      };

      final res = await repo.listPendingInvitations();
      expect(res.isSuccess, isTrue);
      final list = res.valueOrNull!;
      expect(list.length, 1);
      expect(list.first.id, 'inv-1');
      expect(list.first.workspaceName, 'WS Name');
      expect(list.first.universityScopes.length, 1);
    });

    test('acceptInvitation invokes RPC and params correctly', () async {
      String? capturedFn;
      Map<String, dynamic>? capturedParams;

      client.onRpc = (fn, params) async {
        capturedFn = fn;
        capturedParams = params;
        return {'success': true};
      };

      final res = await repo.acceptInvitation('inv-id');
      expect(res.isSuccess, isTrue);
      expect(capturedFn, 'accept_current_user_workspace_invitation');
      expect(capturedParams?['p_invitation_id'], 'inv-id');
    });

    test('declineInvitation invokes RPC and params correctly', () async {
      String? capturedFn;
      Map<String, dynamic>? capturedParams;

      client.onRpc = (fn, params) async {
        capturedFn = fn;
        capturedParams = params;
        return {'success': true};
      };

      final res = await repo.declineInvitation('inv-id');
      expect(res.isSuccess, isTrue);
      expect(capturedFn, 'decline_current_user_workspace_invitation');
      expect(capturedParams?['p_invitation_id'], 'inv-id');
    });

    test('createWorkspace invokes RPC and params correctly', () async {
      String? capturedFn;
      Map<String, dynamic>? capturedParams;

      client.onRpc = (fn, params) async {
        capturedFn = fn;
        capturedParams = params;
        return {'success': true};
      };

      final res = await repo.createWorkspace(name: 'WS', slug: 'ws-slug', industry: 'retail');
      expect(res.isSuccess, isTrue);
      expect(capturedFn, 'create_workspace_with_owner');
      expect(capturedParams?['workspace_name'], 'WS');
      expect(capturedParams?['requested_slug'], 'ws-slug');
      expect(capturedParams?['industry'], 'retail');
    });

    test('setActiveWorkspace invokes RPC and params correctly', () async {
      String? capturedFn;
      Map<String, dynamic>? capturedParams;

      client.onRpc = (fn, params) async {
        capturedFn = fn;
        capturedParams = params;
        return {'success': true};
      };

      final res = await repo.setActiveWorkspace('ws-id');
      expect(res.isSuccess, isTrue);
      expect(capturedFn, 'set_current_user_active_workspace');
      expect(capturedParams?['p_target_workspace_id'], 'ws-id');
    });

    test('listWorkspaces handles transient database error with retry', () async {
      int callCount = 0;
      client.onRpc = (fn, params) async {
        callCount++;
        if (callCount < 3) {
          throw const SocketException('Connection reset by peer');
        }
        return <dynamic>[];
      };

      final res = await repo.listWorkspaces();
      expect(res.isSuccess, isTrue);
      expect(callCount, 3); // 2 failures + 1 success
    });
  });
}
