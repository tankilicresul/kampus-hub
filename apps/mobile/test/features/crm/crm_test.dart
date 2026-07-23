import 'package:flutter_test/flutter_test.dart';
import 'package:kampushub/features/crm/domain/models/crm_business_model.dart';
import 'package:kampushub/features/crm/presentation/crm_state_notifier.dart';

void main() {
  group('CrmBusinessModel Unit Tests', () {
    test('1. JSON Deserialization and Serialization roundtrip', () {
      final json = {
        'id': 'biz-1',
        'workspace_id': 'ws-1',
        'university_id': 'uni-1',
        'name': 'Kampus Kafe',
        'category': 'Food & Beverage',
        'stage': 'discovered',
        'authorized_person_name': 'Ahmet Yılmaz',
        'authorized_person_phone': '05551112233',
        'authorized_person_email': 'ahmet@kafe.com',
        'commission_rate': 12.5,
        'contract_signed_at': null,
        'notes': 'High student traffic location',
        'assigned_representative_id': 'rep-1',
        'created_at': '2026-07-23T20:00:00Z',
      };

      final model = CrmBusinessModel.fromJson(json);

      expect(model.id, equals('biz-1'));
      expect(model.name, equals('Kampus Kafe'));
      expect(model.stage, equals('discovered'));
      expect(model.commissionRate, equals(12.5));
      expect(model.authorizedPersonName, equals('Ahmet Yılmaz'));

      final outputJson = model.toJson();
      expect(outputJson['name'], equals('Kampus Kafe'));
      expect(outputJson['commission_rate'], equals(12.5));
    });

    test('2. Defaults and optional parameters', () {
      final model = CrmBusinessModel(
        id: 'biz-2',
        name: 'Kampus Kırtasiye',
        stage: 'contacted',
        createdAt: DateTime.now(),
      );

      expect(model.commissionRate, equals(0.0));
      expect(model.authorizedPersonName, isNull);
      expect(model.meetingNotes, isNull);
    });
  });

  group('CrmState Unit Tests', () {
    test('3. CrmState copyWith operates cleanly', () {
      const initialState = CrmState();
      expect(initialState.isLoading, isFalse);
      expect(initialState.businesses, isEmpty);

      final business = CrmBusinessModel(
        id: 'biz-1',
        name: 'Kampus Market',
        createdAt: DateTime.now(),
      );

      final updatedState = initialState.copyWith(
        isLoading: true,
        businesses: [business],
        errorMessage: 'Database connection failed',
      );

      expect(updatedState.isLoading, isTrue);
      expect(updatedState.businesses.length, equals(1));
      expect(updatedState.errorMessage, equals('Database connection failed'));
    });
  });
}
