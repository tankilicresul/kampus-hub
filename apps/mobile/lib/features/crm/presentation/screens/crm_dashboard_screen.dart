import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/auth_state_notifier.dart';
import '../../../workspace/presentation/workspace_state_notifier.dart';
import '../../domain/models/crm_business_model.dart';
import '../crm_state_notifier.dart';

class CrmDashboardScreen extends ConsumerStatefulWidget {
  const CrmDashboardScreen({super.key});

  @override
  ConsumerState<CrmDashboardScreen> createState() => _CrmDashboardScreenState();
}

class _CrmDashboardScreenState extends ConsumerState<CrmDashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final activeWs = ref.read(workspaceStateProvider).activeWorkspace;
      final wsId = activeWs?.id ?? 'df39e73b-bf72-4d1a-9694-82bd8996b797';
      ref.read(crmStateProvider.notifier).loadBusinesses(wsId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final crmState = ref.watch(crmStateProvider);
    final authState = ref.watch(authStateProvider);
    final activeWs = ref.watch(workspaceStateProvider).activeWorkspace;
    final isAdminOrManager = authState.role == 'admin' ||
        activeWs?.permissionRole == 'owner' ||
        activeWs?.permissionRole == 'admin';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('CRM & İşletme Takibi'),
        backgroundColor: const Color(0xFF1E293B),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF8B5CF6),
        icon: const Icon(Icons.add_business_rounded, color: Colors.white),
        label: const Text('İşletme Ekle', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showAddBusinessDialog(context),
      ),
      body: crmState.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
          : crmState.businesses.isEmpty
              ? _buildEmptyState()
              : _buildPipelineView(crmState.businesses, isAdminOrManager),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.storefront_outlined, size: 64, color: Color(0xFF64748B)),
          const SizedBox(height: 16),
          const Text(
            'Henüz CRM kaydı bulunmuyor',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Kampüs çevresindeki üye aday işletmeleri ekleyerek takip başlatın.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6)),
            icon: const Icon(Icons.add_business_rounded, color: Colors.white),
            label: const Text('İşletme Ekle', style: TextStyle(color: Colors.white)),
            onPressed: () => _showAddBusinessDialog(context),
          ),
        ],
      ),
    );
  }

  static const _stages = [
    {'key': 'discovered', 'title': 'Keşfedildi', 'color': Colors.blue},
    {'key': 'contacted', 'title': 'İletişime Geçildi', 'color': Colors.amber},
    {'key': 'agreement_reached', 'title': 'Anlaşma Sağlandı', 'color': Colors.purple},
    {'key': 'active', 'title': 'Aktif Üye', 'color': Colors.green},
  ];

  Widget _buildPipelineView(List<CrmBusinessModel> businesses, bool isAdminOrManager) {
    final groupedBusinesses = <String, List<CrmBusinessModel>>{};
    for (final b in businesses) {
      groupedBusinesses.putIfAbsent(b.stage, () => []).add(b);
    }

    final totalCount = businesses.length;
    final activeCount = (groupedBusinesses['active']?.length ?? 0) + (groupedBusinesses['agreement_reached']?.length ?? 0);
    final winRate = totalCount > 0 ? ((activeCount / totalCount) * 100).round() : 0;

    return Column(
      children: [
        // Analytics Summary Header
        Container(
          width: double.infinity,
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatMetric('Toplam İşletme', '$totalCount', Icons.storefront_rounded, const Color(0xFF38BDF8)),
              Container(width: 1, height: 36, color: const Color(0xFF334155)),
              _buildStatMetric('Anlaşma / Aktif', '$activeCount', Icons.handshake_rounded, const Color(0xFF4ADE80)),
              Container(width: 1, height: 36, color: const Color(0xFF334155)),
              _buildStatMetric('Başarı Oranı', '%$winRate', Icons.trending_up_rounded, const Color(0xFFA78BFA)),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _stages.map((stage) {
          final stageKey = stage['key'] as String;
          final title = stage['title'] as String;
          final color = stage['color'] as Color;
          final stageBusinesses = groupedBusinesses[stageKey] ?? const <CrmBusinessModel>[];

          return Container(
            width: 280,
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('${stageBusinesses.length}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 520),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: stageBusinesses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final business = stageBusinesses[index];
                      return _buildBusinessCard(business, isAdminOrManager);
                    },
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    ),
  ),
],
);
}

  Widget _buildStatMetric(String label, String value, IconData icon, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 4),
            Text(
              value,
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildBusinessCard(CrmBusinessModel business, bool isAdminOrManager) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  business.name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF94A3B8), size: 18),
                color: const Color(0xFF1E293B),
                onSelected: (newStage) {
                  ref.read(crmStateProvider.notifier).updateStage(business.id, newStage);
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'discovered', child: Text('Keşfedildi', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'contacted', child: Text('İletişime Geçildi', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'agreement_reached', child: Text('Anlaşma Sağlandı', style: TextStyle(color: Colors.white))),
                  const PopupMenuItem(value: 'active', child: Text('Aktif Üye', style: TextStyle(color: Colors.white))),
                ],
              ),
            ],
          ),
          if (business.authorizedPersonName != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.person_outline_rounded, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text(
                  business.authorizedPersonName!,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ],
          if (business.authorizedPersonPhone != null) ...[
            const SizedBox(height: 2),
            Row(
              children: [
                const Icon(Icons.phone_outlined, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text(
                  business.authorizedPersonPhone!,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ],
          if (isAdminOrManager) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 12, color: Color(0xFFA78BFA)),
                  const SizedBox(width: 4),
                  Text(
                    'Komisyon: %${business.commissionRate.toStringAsFixed(1)}',
                    style: const TextStyle(color: Color(0xFFA78BFA), fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showAddBusinessDialog(BuildContext context) {
    final nameController = TextEditingController();
    final personController = TextEditingController();
    final phoneController = TextEditingController();
    final commissionController = TextEditingController(text: '10.0');

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Yeni İşletme Kaydı', style: TextStyle(color: Colors.white)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'İşletme Adı',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: personController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Yetkili Adı Soyadı',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Yetkili Telefon Numarası',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: commissionController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Komisyon Oranı (%)',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6)),
            onPressed: () async {
              if (nameController.text.trim().isNotEmpty) {
                final activeWs = ref.read(workspaceStateProvider).activeWorkspace;
                final wsId = activeWs?.id ?? 'df39e73b-bf72-4d1a-9694-82bd8996b797';
                final newBusiness = CrmBusinessModel(
                  id: '',
                  workspaceId: wsId,
                  name: nameController.text.trim(),
                  authorizedPersonName: personController.text.trim().isEmpty ? null : personController.text.trim(),
                  authorizedPersonPhone: phoneController.text.trim().isEmpty ? null : phoneController.text.trim(),
                  commissionRate: double.tryParse(commissionController.text.trim()) ?? 10.0,
                  stage: 'discovered',
                  createdAt: DateTime.now(),
                );
                Navigator.pop(dialogCtx);
                final success = await ref.read(crmStateProvider.notifier).createBusiness(newBusiness);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        success
                            ? '${newBusiness.name} işletmesi eklendi'
                            : 'Ekleme başarısız: ${ref.read(crmStateProvider).errorMessage ?? "Bilinmeyen hata"}',
                      ),
                      backgroundColor: success ? Colors.green : Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Kaydet', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
