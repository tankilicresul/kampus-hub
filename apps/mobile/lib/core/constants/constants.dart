import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConstants {
  // Supabase Local Dev Fallbacks (Host PC Wi-Fi IP for physical device connectivity)
  static const String _rawSupabaseUrl = 'http://172.21.169.249:54321';

  static String get defaultSupabaseUrl {
    return _rawSupabaseUrl;
  }

  static const String defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  // Google OAuth Placeholders (to be updated by Cloud Administrator)
  static const String googleWebClientId = 'GOOGLE_WEB_CLIENT_ID_PLACEHOLDER';
  static const String googleIosClientId = 'GOOGLE_IOS_CLIENT_ID_PLACEHOLDER';

  // Secure Storage keys
  static const String keyIsBiometricEnabled = 'is_biometric_enabled';
  static const String keyLastInteractionTime = 'last_interaction_time';
  static const String keyRegisteredDeviceHash = 'registered_device_hash';

  // Inactivity lock duration (15 minutes)
  static const int inactivityTimeoutMinutes = 15;
}
