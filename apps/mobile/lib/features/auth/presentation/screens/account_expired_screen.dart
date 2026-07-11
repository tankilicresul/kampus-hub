import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth_state_notifier.dart';

class AccountExpiredScreen extends ConsumerWidget {
  const AccountExpiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.history_toggle_off_rounded,
                size: 80,
                color: Color(0xFFF97316),
              ),
              const SizedBox(height: 24),
              const Text(
                'Erişim Süresi Doldu',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Hesabınız için atanan geçici erişim süresi dolmuştur. Yeni bir davetiye talep etmek için lütfen yöneticinizle iletişime geçin.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: () => ref.read(authStateProvider.notifier).signOut(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E293B),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(200, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Kapat'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
