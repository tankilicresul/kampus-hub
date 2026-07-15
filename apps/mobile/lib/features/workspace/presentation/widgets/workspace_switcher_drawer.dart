import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kampushub/core/result/app_result.dart';
import 'package:kampushub/features/auth/presentation/auth_state_notifier.dart';
import '../workspace_state_notifier.dart';

class WorkspaceSwitcherDrawer extends ConsumerWidget {
  const WorkspaceSwitcherDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceState = ref.watch(workspaceStateProvider);
    final authState = ref.watch(authStateProvider);
    final workspaceNotifier = ref.read(workspaceStateProvider.notifier);
    final authNotifier = ref.read(authStateProvider.notifier);

    return Drawer(
      backgroundColor: const Color(0xFF0F172A),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const CircleAvatar(
                  backgroundColor: Color(0xFF6366F1),
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  authState.email ?? 'Oturum Açık',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Rol: ${authState.role ?? "staff"}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Text(
              'Çalışma Alanları',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: workspaceState.workspaces.length,
              itemBuilder: (context, index) {
                final workspace = workspaceState.workspaces[index];
                final isActive = workspace.id == workspaceState.activeWorkspace?.id;

                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isActive ? const Color(0xFF6366F1) : const Color(0xFF334155),
                    child: Text(
                      workspace.name.substring(0, 1).toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  title: Text(
                    workspace.name,
                    style: TextStyle(
                      color: isActive ? Colors.white : const Color(0xFF94A3B8),
                      fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    'Rol: ${workspace.permissionRole}',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  ),
                  trailing: isActive
                      ? const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981))
                      : null,
                  onTap: () async {
                    Navigator.of(context).pop(); // Close drawer
                    if (!isActive) {
                      final res = await workspaceNotifier.selectWorkspace(workspace.id);
                      if (context.mounted && res is AppError) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Hata: ${res.failure.userMessage}')),
                        );
                      }
                    }
                  },
                );
              },
            ),
          ),
          const Divider(color: Color(0xFF334155)),
          ListTile(
            leading: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF6366F1)),
            title: const Text('Yeni Çalışma Alanı', style: TextStyle(color: Colors.white)),
            onTap: () {
              Navigator.of(context).pop(); // Close drawer
              context.push('/create-workspace');
            },
          ),
          ListTile(
            leading: const Icon(Icons.mail_outline_rounded, color: Color(0xFF64748B)),
            title: const Text('Davetler', style: TextStyle(color: Color(0xFF94A3B8))),
            trailing: workspaceState.invitations.isNotEmpty
                ? Badge(label: Text('${workspaceState.invitations.length}'))
                : null,
            onTap: () {
              Navigator.of(context).pop(); // Close drawer
              context.push('/invitations');
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
            title: const Text('Çıkış Yap', style: TextStyle(color: Color(0xFFEF4444))),
            onTap: () {
              Navigator.of(context).pop(); // Close drawer
              authNotifier.signOut();
            },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
