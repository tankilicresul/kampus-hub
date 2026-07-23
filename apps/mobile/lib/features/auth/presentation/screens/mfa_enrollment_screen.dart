import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kapindahub/core/result/app_result.dart';
import '../auth_state_notifier.dart';

/// MFA TOTP Enrollment Screen — shown when admin user has no verified TOTP factor.
///
/// Displays a scannable QR code (from the enrolled TOTP URI) and a code entry
/// field so the user can confirm the factor immediately.
class MfaEnrollmentScreen extends ConsumerStatefulWidget {
  const MfaEnrollmentScreen({super.key});

  @override
  ConsumerState<MfaEnrollmentScreen> createState() =>
      _MfaEnrollmentScreenState();
}

class _MfaEnrollmentScreenState extends ConsumerState<MfaEnrollmentScreen> {
  final _codeController = TextEditingController();
  bool _isVerifying = false;
  String? _errorMessage;
  bool _secretVisible = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _codeController.text.trim();
    if (code.length != 6 || int.tryParse(code) == null) {
      setState(() {
        _errorMessage = '6 haneli sayısal kod giriniz.';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    final result = await ref.read(authStateProvider.notifier).verifyMfaCode(code);

    if (mounted) {
      setState(() {
        _isVerifying = false;
      });
      if (result is AppError<void>) {
        setState(() {
          _errorMessage = result.failure.userMessage;
        });
      }
      // On success, notifier calls completeMfaVerification() which changes state
      // → router will redirect away from /mfa automatically
    }
  }

  /// Decodes the base64 PNG data URI returned by Supabase TOTP enroll.
  /// Format: "data:image/png;base64,<base64data>"
  Uint8List? _decodeQrBytes(String qrCodeUri) {
    try {
      final base64Str = qrCodeUri.contains(',')
          ? qrCodeUri.split(',').last
          : qrCodeUri;
      return base64Decode(base64Str);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final enrollment = authState.mfaEnrollment;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              // Header
              const Icon(Icons.security_rounded, size: 56, color: Color(0xFF6366F1)),
              const SizedBox(height: 20),
              const Text(
                'İki Aşamalı Doğrulama Kurulumu',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              const Text(
                'Hesabınızı korumak için bir kimlik doğrulayıcı uygulama ile QR kodu tarayın '
                '(Google Authenticator, Authy vb.), ardından 6 haneli kodu girin.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // QR Code or loading indicator
              if (enrollment == null)
                const Center(
                  child: CircularProgressIndicator(color: Color(0xFF6366F1)),
                )
              else ...[
                // QR Code Image
                Center(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withAlpha(77),
                          blurRadius: 24,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Builder(builder: (context) {
                      final bytes = _decodeQrBytes(enrollment.qrCodeUri);
                      if (bytes != null) {
                        return Image.memory(
                          bytes,
                          width: 200,
                          height: 200,
                          fit: BoxFit.contain,
                        );
                      }
                      // Fallback: show URI as selectable text
                      return const SizedBox(
                        width: 200,
                        height: 200,
                        child: Center(
                          child: Text(
                            'QR kod yüklenemedi',
                            style: TextStyle(color: Colors.black54),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 20),

                // Manual entry secret (collapsible)
                GestureDetector(
                  onTap: () => setState(() => _secretVisible = !_secretVisible),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _secretVisible
                            ? Icons.visibility_off_rounded
                            : Icons.vpn_key_rounded,
                        color: const Color(0xFF64748B),
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _secretVisible
                            ? 'Gizli anahtarı gizle'
                            : 'Manuel giriş için gizli anahtarı göster',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                          decoration: TextDecoration.underline,
                          decorationColor: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                if (_secretVisible) ...[
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: enrollment.secret));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Gizli anahtar kopyalandı')),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              enrollment.secret,
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontFamily: 'monospace',
                                fontSize: 13,
                                letterSpacing: 1.4,
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.copy_rounded,
                            color: Color(0xFF64748B),
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],

              const SizedBox(height: 28),

              // Error message
              if (_errorMessage != null) ...[
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF7F1D1D),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Color(0xFFFECACA), fontSize: 13),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // 6-digit code input
              const Text(
                '6 Haneli Doğrulama Kodu',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  letterSpacing: 8,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  counterText: '',
                  hintText: '000000',
                  hintStyle: const TextStyle(
                    color: Color(0xFF475569),
                    letterSpacing: 8,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 18,
                    horizontal: 16,
                  ),
                ),
                onSubmitted: (_) => _verify(),
              ),
              const SizedBox(height: 24),

              // Verify button
              ElevatedButton(
                onPressed: (enrollment == null || _isVerifying) ? null : _verify,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isVerifying
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Doğrula ve Tamamla',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),

              const SizedBox(height: 12),

              // Debug-only bypass
              if (kDebugMode) ...[
                OutlinedButton(
                  onPressed: () {
                    ref.read(authStateProvider.notifier).completeMfaSimulation();
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF64748B),
                    side: const BorderSide(color: Color(0xFF334155)),
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('[DEBUG] Simülasyonla Geç'),
                ),
                const SizedBox(height: 8),
              ],

              // Sign out
              TextButton(
                onPressed: () => ref.read(authStateProvider.notifier).signOut(),
                child: const Text(
                  'Çıkış Yap',
                  style: TextStyle(color: Color(0xFF64748B)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
