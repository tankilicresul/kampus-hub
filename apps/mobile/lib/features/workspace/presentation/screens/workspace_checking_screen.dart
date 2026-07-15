import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import '../workspace_state_notifier.dart';

class WorkspaceCheckingScreen extends ConsumerWidget {
  const WorkspaceCheckingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceState = ref.watch(workspaceStateProvider);
    final workspaceNotifier = ref.read(workspaceStateProvider.notifier);
    final authNotifier = ref.read(authStateProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (workspaceState.error != null) ...[
                const Icon(
                  Icons.error_outline_rounded,
                  color: Color(0xFFEF4444),
                  size: 64,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Bağlantı Hatası',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  workspaceState.error!,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: () => workspaceNotifier.loadWorkspaceData(),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Tekrar Dene'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(180, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => authNotifier.signOut(),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF94A3B8),
                  ),
                  child: const Text('Çıkış Yap'),
                ),
              ] else ...[
                const CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 3),
                const SizedBox(height: 24),
                const Text(
                  'Çalışma Alanı Kontrolü',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Lütfen bekleyin, çalışma alanlarınız yükleniyor.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
