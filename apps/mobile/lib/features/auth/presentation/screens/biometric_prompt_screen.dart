import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import '../auth_state_notifier.dart';

class BiometricPromptScreen extends ConsumerStatefulWidget {
  const BiometricPromptScreen({super.key});

  @override
  ConsumerState<BiometricPromptScreen> createState() =>
      _BiometricPromptScreenState();
}

class _BiometricPromptScreenState extends ConsumerState<BiometricPromptScreen> {
  final LocalAuthentication _localAuth = LocalAuthentication();
  String _statusMessage =
      'Kimliğinizi doğrulamak için lütfen parmak izinizi veya yüzünüzü taratın.';
  bool _isAuthenticating = false;

  @override
  void initState() {
    super.initState();
    // Auto-trigger biometric prompt on screen load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _authenticate();
    });
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;

    try {
      final bool canCheck = await _localAuth.canCheckBiometrics;
      final bool isSupported = await _localAuth.isDeviceSupported();

      if (!canCheck && !isSupported) {
        setState(() {
          _statusMessage = 'Cihazınızda biyometrik doğrulama desteklenmiyor.';
        });
        return;
      }

      setState(() {
        _isAuthenticating = true;
        _statusMessage = 'Biyometrik tarama yapılıyor...';
      });

      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason:
            'Kapında Hub oturumunu açmak için biyometrik doğrulama gereklidir.',
        options: const AuthenticationOptions(
          biometricOnly: true,
          useErrorDialogs: true,
          stickyAuth: true,
        ),
      );

      setState(() {
        _isAuthenticating = false;
      });

      if (didAuthenticate) {
        ref.read(authStateProvider.notifier).unlockBiometric();
      } else {
        setState(() {
          _statusMessage = 'Doğrulama başarısız oldu. Lütfen tekrar deneyin.';
        });
      }
    } catch (e) {
      setState(() {
        _isAuthenticating = false;
        _statusMessage = 'Doğrulama sırasında hata oluştu: ${e.toString()}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.fingerprint_rounded,
                size: 90,
                color: Color(0xFF6366F1),
              ),
              const SizedBox(height: 24),
              const Text(
                'Uygulama Kilitli',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _statusMessage,
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              if (!_isAuthenticating)
                ElevatedButton(
                  onPressed: _authenticate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Biyometri ile Aç',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () {
                      // Skip this time option (locks session or logs out depending on security preferences)
                      ref.read(authStateProvider.notifier).signOut();
                    },
                    child: const Text(
                      'Bu Kez Atla',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      // Navigate to settings simulation
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Sistem ayarlarına yönlendiriliyor...'),
                        ),
                      );
                    },
                    child: const Text(
                      'Sistem Ayarlarına Git',
                      style: TextStyle(color: Color(0xFF8B5CF6)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
