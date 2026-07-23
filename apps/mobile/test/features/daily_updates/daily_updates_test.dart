import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/features/daily_updates/domain/models/daily_update_model.dart';
import 'package:kampushub/features/daily_updates/presentation/daily_update_state_notifier.dart';

void main() {
  group('DailyUpdateModel Unit Tests', () {
    test('1. JSON Deserialization and Serialization roundtrip', () {
      final json = {
        'id': 'up-101',
        'user_id': 'usr-1',
        'workspace_id': 'ws-1',
        'completed_today': 'Fix bug in auth',
        'ongoing_work': 'Refactoring tasks screen',
        'blockers': 'Waiting on design',
        'support_needed': null,
        'tomorrow_plan': 'Write unit tests',
        'related_tasks': ['task-1', 'task-2'],
        'additional_notes': 'No notes',
        'status': 'published',
        'is_late': false,
        'created_at': '2026-07-23T19:30:00Z',
      };

      final model = DailyUpdateModel.fromJson(json);

      expect(model.id, equals('up-101'));
      expect(model.userId, equals('usr-1'));
      expect(model.completedToday, equals('Fix bug in auth'));
      expect(model.relatedTasks.length, equals(2));
      expect(model.isLate, isFalse);

      final outputJson = model.toJson();
      expect(outputJson['user_id'], equals('usr-1'));
      expect(outputJson['completed_today'], equals('Fix bug in auth'));
    });

    test('2. Defaults and optional parameters', () {
      final model = DailyUpdateModel(
        id: '1',
        userId: 'u1',
        completedToday: 'Work done',
        ongoingWork: 'Work ongoing',
        tomorrowPlan: 'Tomorrow plan',
        createdAt: DateTime.now(),
      );

      expect(model.status, equals('draft'));
      expect(model.isLate, isFalse);
      expect(model.blockers, isNull);
      expect(model.relatedTasks, isEmpty);
    });
  });

  group('DailyUpdateState Unit Tests', () {
    test('3. DailyUpdateState copyWith retains and replaces properties correctly', () {
      const initialState = DailyUpdateState();
      expect(initialState.isLoading, isFalse);
      expect(initialState.updates, isEmpty);

      final update = DailyUpdateModel(
        id: '1',
        userId: 'u1',
        completedToday: 'Work done',
        ongoingWork: 'Work ongoing',
        tomorrowPlan: 'Tomorrow plan',
        createdAt: DateTime.now(),
      );

      final nextState = initialState.copyWith(
        isLoading: true,
        updates: [update],
        errorMessage: 'Network error',
      );

      expect(nextState.isLoading, isTrue);
      expect(nextState.updates.length, equals(1));
      expect(nextState.errorMessage, equals('Network error'));
    });
  });
}
