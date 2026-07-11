import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth_state_notifier.dart';

class DeviceLimitScreen extends ConsumerWidget {
  const DeviceLimitScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final authNotifier = ref.read(authStateProvider.notifier);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text(
          'Cihaz Sınırı Aşıldı',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => authNotifier.signOut(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(
              child: Icon(
                Icons.devices_other_rounded,
                size: 80,
                color: Color(0xFFF59E0B),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Aktif Cihaz Sınırına Ulaştınız',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Kampüs Hub hesabınız aynı anda en fazla 2 aktif cihazda kullanılabilir. Giriş yapmak için aşağıdaki aktif cihazlarınızdan birini iptal etmeniz gerekmektedir.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
            const SizedBox(height: 24),
            const Text(
              'Aktif Cihazlarınız:',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: authState.activeDevices.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      itemCount: authState.activeDevices.length,
                      itemBuilder: (context, index) {
                        final device = authState.activeDevices[index];

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          color: const Color(0xFF1E293B),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: ListTile(
                            leading: Icon(
                              device['platform'] == 'iOS'
                                  ? Icons.phone_iphone
                                  : Icons.phone_android,
                              color: const Color(0xFF6366F1),
                              size: 28,
                            ),
                            title: Text(
                              device['device_name'] ?? 'Bilinmeyen Cihaz',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(
                              'Son görülme: ${device['last_seen_at'] ?? 'Bilinmiyor'}',
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 12,
                              ),
                            ),
                            trailing: IconButton(
                              icon: const Icon(
                                Icons.cancel_outlined,
                                color: Color(0xFFEF4444),
                              ),
                              onPressed: () {
                                // Confirmation dialog to revoke device
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('Oturumu Sonlandır'),
                                    content: Text(
                                      '${device['device_name']} cihazının bağlantısını kesmek istiyor musunuz?',
                                    ),
                                    actions: [
                                      TextButton(
                                        child: const Text('İptal'),
                                        onPressed: () =>
                                            Navigator.of(ctx).pop(),
                                      ),
                                      TextButton(
                                        child: const Text(
                                          'Evet, Sonlandır',
                                          style: TextStyle(
                                            color: Color(0xFFEF4444),
                                          ),
                                        ),
                                        onPressed: () {
                                          Navigator.of(ctx).pop();
                                          authNotifier.revokeDevice(
                                            device['id'],
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
