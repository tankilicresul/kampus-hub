import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/constants.dart';

class InactivityTracker with WidgetsBindingObserver {
  final FlutterSecureStorage _storage;
  VoidCallback? _onLockRequired;

  InactivityTracker(this._storage) {
    WidgetsBinding.instance.addObserver(this);
  }

  void initialize(VoidCallback onLockRequired) {
    _onLockRequired = onLockRequired;
    // Set initial interaction time
    updateActivity();
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
  }

  /// Record user activity (triggered by key interaction points in the UI)
  Future<void> updateActivity() async {
    final nowStr = DateTime.now().toIso8601String();
    await _storage.write(
      key: AppConstants.keyLastInteractionTime,
      value: nowStr,
    );
  }

  /// Verifies if lock is required based on duration elapsed since last activity
  Future<bool> checkLockRequired() async {
    final lastActivityStr = await _storage.read(
      key: AppConstants.keyLastInteractionTime,
    );
    if (lastActivityStr == null) {
      return false;
    }

    try {
      final lastActivity = DateTime.parse(lastActivityStr);
      final elapsed = DateTime.now().difference(lastActivity);
      return elapsed.inMinutes >= AppConstants.inactivityTimeoutMinutes;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> didChangeAppLifecycleState(AppLifecycleState state) async {
    if (state == AppLifecycleState.paused) {
      // Record activity right before going into the background
      await updateActivity();
    } else if (state == AppLifecycleState.resumed) {
      // Check if timeout has expired
      final shouldLock = await checkLockRequired();
      if (shouldLock && _onLockRequired != null) {
        _onLockRequired!();
      }
    }
  }
}
