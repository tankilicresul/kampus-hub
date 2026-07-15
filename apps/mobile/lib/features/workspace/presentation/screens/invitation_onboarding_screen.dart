import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import '../workspace_state_notifier.dart';

class InvitationOnboardingScreen extends ConsumerWidget {
  const InvitationOnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceState = ref.watch(workspaceStateProvider);
    final workspaceNotifier = ref.read(workspaceStateProvider.notifier);
    final authNotifier = ref.read(authStateProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Icon(Icons.mail_outline_rounded, size: 64, color: Color(0xFF6366F1)),
              const SizedBox(height: 16),
              const Text(
                'Çalışma Alanı Davetleri',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Bir çalışma alanına katılmak için davetleri kabul edebilir veya yeni bir çalışma alanı oluşturabilirsiniz.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Expanded(
                child: workspaceState.invitations.isEmpty
                    ? _buildEmptyState(context)
                    : _buildInvitationsList(context, ref, workspaceState, workspaceNotifier),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.push('/create-workspace'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Yeni Çalışma Alanı Oluştur',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => authNotifier.signOut(),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                ),
                child: const Text('Çıkış Yap'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox_rounded, size: 48, color: Color(0x8064748B)),
          SizedBox(height: 16),
          Text(
            'Bekleyen davetiniz bulunmuyor.',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildInvitationsList(
    BuildContext context,
    WidgetRef ref,
    WorkspaceState state,
    WorkspaceStateNotifier notifier,
  ) {
    return ListView.separated(
      itemCount: state.invitations.length,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final invitation = state.invitations[index];
        return Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF334155), width: 1),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: const Color(0xFF312E81),
                    child: Text(
                      invitation.workspaceName.substring(0, 1).toUpperCase(),
                      style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invitation.workspaceName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Gönderen: ${invitation.invitedByName ?? "Bilinmiyor"}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Rol: ${invitation.permissionRole.toUpperCase()} • ${invitation.jobRole}',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final res = await notifier.declineInvite(invitation.id);
                        if (context.mounted) {
                          if (res is AppSuccess<void>) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Davet reddedildi.')),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Hata: ${(res as AppError).failure.userMessage}')),
                            );
                          }
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFEF4444)),
                        foregroundColor: const Color(0xFFEF4444),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        minimumSize: const Size(0, 44),
                      ),
                      child: const Text('Reddet'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final res = await notifier.acceptInvite(invitation.id);
                        if (context.mounted) {
                          if (res is AppSuccess<void>) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Davet kabul edildi!')),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Hata: ${(res as AppError).failure.userMessage}')),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        minimumSize: const Size(0, 44),
                      ),
                      child: const Text('Kabul Et'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
