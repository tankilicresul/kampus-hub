import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/features/tasks/domain/models/task_model.dart';
import 'package:kampushub/features/daily_updates/domain/models/daily_update_model.dart';
import 'package:kampushub/features/crm/domain/models/crm_business_model.dart';

void main() {
  group('Milestone 4 & 5 Domain Models Unit Tests', () {
    test('TaskModel serializes and deserializes correctly', () {
      final now = DateTime.now();
      final task = TaskModel(
        id: 'task-1',
        title: 'Kampüs Keşif Ziyareti',
        description: 'Detaylı saha araştırması',
        priority: 'critical',
        status: 'todo',
        createdAt: now,
      );

      final json = task.toJson();
      expect(json['title'], equals('Kampüs Keşif Ziyareti'));
      expect(json['priority'], equals('critical'));

      final copy = task.copyWith(status: 'completed');
      expect(copy.status, equals('completed'));
      expect(copy.title, equals(task.title));
    });

    test('DailyUpdateModel serializes correctly', () {
      final now = DateTime.now();
      final update = DailyUpdateModel(
        id: 'update-1',
        userId: 'user-1',
        completedToday: 'Saha ziyaretleri yapıldı',
        ongoingWork: 'Teklifler hazırlanıyor',
        tomorrowPlan: 'Stant yeri kiralaması',
        createdAt: now,
      );

      final json = update.toJson();
      expect(json['completed_today'], equals('Saha ziyaretleri yapıldı'));
      expect(json['status'], equals('draft'));
    });

    test('CrmBusinessModel serializes correctly', () {
      final now = DateTime.now();
      final business = CrmBusinessModel(
        id: 'biz-1',
        name: 'Kampüs Kafe',
        stage: 'discovered',
        commissionRate: 15.0,
        createdAt: now,
      );

      final json = business.toJson();
      expect(json['name'], equals('Kampüs Kafe'));
      expect(json['commission_rate'], equals(15.0));
    });
  });
}
