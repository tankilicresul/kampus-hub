import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/auth_state_notifier.dart';
import '../../../workspace/presentation/workspace_state_notifier.dart';
import '../../domain/models/daily_update_model.dart';
import '../daily_update_state_notifier.dart';

class DailyUpdatesScreen extends ConsumerStatefulWidget {
  const DailyUpdatesScreen({super.key});

  @override
  ConsumerState<DailyUpdatesScreen> createState() => _DailyUpdatesScreenState();
}

class _DailyUpdatesScreenState extends ConsumerState<DailyUpdatesScreen> {
  final _completedController = TextEditingController();
  final _ongoingController = TextEditingController();
  final _blockersController = TextEditingController();
  final _planController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final activeWs = ref.read(workspaceStateProvider).activeWorkspace;
      if (activeWs != null) {
        ref.read(dailyUpdateStateProvider.notifier).loadDailyUpdates(activeWs.id);
      }
    });
  }

  @override
  void dispose() {
    _completedController.dispose();
    _ongoingController.dispose();
    _blockersController.dispose();
    _planController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final updateState = ref.watch(dailyUpdateStateProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Günlük Raporlama (Daily Updates)'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF10B981),
        icon: const Icon(Icons.edit_note_rounded, color: Colors.white),
        label: const Text('Rapor Oluştur', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showSubmitModal(context),
      ),
      body: updateState.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : updateState.updates.isEmpty
              ? _buildEmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: updateState.updates.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final update = updateState.updates[index];
                    return _buildUpdateCard(update);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.article_outlined, size: 64, color: Color(0xFF64748B)),
          const SizedBox(height: 16),
          const Text(
            'Henüz rapor bulunmuyor',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bugünkü çalışmalarınızı ekiple paylaşmak için ilk raporunuzu oluşturun.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            icon: const Icon(Icons.edit_note_rounded, color: Colors.white),
            label: const Text('Rapor Yaz', style: TextStyle(color: Colors.white)),
            onPressed: () => _showSubmitModal(context),
          ),
        ],
      ),
    );
  }

  Widget _buildUpdateCard(DailyUpdateModel update) {
    final dateStr = '${update.createdAt.day}.${update.createdAt.month}.${update.createdAt.year} - ${update.createdAt.hour}:${update.createdAt.minute.toString().padLeft(2, '0')}';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.account_circle_rounded, color: Color(0xFF94A3B8), size: 24),
              const SizedBox(width: 8),
              Text(
                dateStr,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const Spacer(),
              if (update.isLate)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'GEÇ RAPOR (20:00+)',
                    style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          const Divider(color: Color(0xFF334155), height: 24),
          _buildSection('Tamamlanan İşler', update.completedToday, Icons.check_circle_outline_rounded, Colors.green),
          const SizedBox(height: 12),
          _buildSection('Devam Eden İşler', update.ongoingWork, Icons.rotate_right_rounded, Colors.amber),
          if (update.blockers != null && update.blockers!.isNotEmpty) ...[
            const SizedBox(height: 12),
            _buildSection('Engeller / Destek İhtiyacı', update.blockers!, Icons.warning_amber_rounded, Colors.red),
          ],
          const SizedBox(height: 12),
          _buildSection('Yarının Planı', update.tomorrowPlan, Icons.event_note_rounded, Colors.blue),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content, IconData icon, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          content,
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
        ),
      ],
    );
  }

  void _showSubmitModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Günlük Rapor Oluştur',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(modalCtx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _completedController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Bugün Neler Tamamlandı?',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ongoingController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Devam Eden Çalışmalar',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _blockersController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Engeller / Karşılaşılan Sorunlar (Opsiyonel)',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _planController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Yarının Planı',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                  onPressed: () async {
                    if (_completedController.text.trim().isNotEmpty &&
                        _ongoingController.text.trim().isNotEmpty &&
                        _planController.text.trim().isNotEmpty) {
                      final authState = ref.read(authStateProvider);
                      final activeWs = ref.read(workspaceStateProvider).activeWorkspace;

                      final newUpdate = DailyUpdateModel(
                        id: '',
                        userId: authState.userId ?? authState.email ?? '',
                        workspaceId: activeWs?.id,
                        completedToday: _completedController.text.trim(),
                        ongoingWork: _ongoingController.text.trim(),
                        blockers: _blockersController.text.trim().isEmpty ? null : _blockersController.text.trim(),
                        tomorrowPlan: _planController.text.trim(),
                        status: 'published',
                        createdAt: DateTime.now(),
                      );

                      Navigator.pop(modalCtx);
                      final success = await ref.read(dailyUpdateStateProvider.notifier).submitUpdate(newUpdate);
                      if (success) {
                        _completedController.clear();
                        _ongoingController.clear();
                        _blockersController.clear();
                        _planController.clear();
                      }
                    }
                  },
                  child: const Text('Raporu Gönder', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
