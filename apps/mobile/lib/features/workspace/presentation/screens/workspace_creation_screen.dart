import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kapindahub/core/result/app_result.dart';
import '../workspace_state_notifier.dart';

class WorkspaceCreationScreen extends ConsumerStatefulWidget {
  const WorkspaceCreationScreen({super.key});

  @override
  ConsumerState<WorkspaceCreationScreen> createState() => _WorkspaceCreationScreenState();
}

class _WorkspaceCreationScreenState extends ConsumerState<WorkspaceCreationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  String _selectedIndustry = 'education';
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  // Helper to auto-generate slug from name as user types
  void _onNameChanged(String name) {
    var generated = name.toLowerCase();
    final trMap = {
      'ç': 'c',
      'ğ': 'g',
      'ı': 'i',
      'ö': 'o',
      'ş': 's',
      'ü': 'u',
    };
    trMap.forEach((key, val) {
      generated = generated.replaceAll(key, val);
    });
    generated = generated
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-');

    if (_slugController.text.isEmpty ||
        _slugController.text == generated.substring(0, generated.isNotEmpty ? generated.length - 1 : 0)) {
      _slugController.text = generated;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final notifier = ref.read(workspaceStateProvider.notifier);
    final res = await notifier.createNewWorkspace(
      name: _nameController.text.trim(),
      slug: _slugController.text.trim(),
      industry: _selectedIndustry,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (res is AppSuccess<void>) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Çalışma alanı başarıyla oluşturuldu!')),
        );
        context.go('/'); // Navigate to dashboard
      } else {
        setState(() {
          _errorMessage = (res as AppError).failure.userMessage;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text('Yeni Çalışma Alanı', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Kendi Çalışma Alanını Kur',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Çalışma alanı ismini ve benzersiz adresini (slug) belirleyerek ekibinizi yönetmeye başlayın.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                const SizedBox(height: 32),
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
                  const SizedBox(height: 20),
                ],
                const Text(
                  'Çalışma Alanı Adı',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  onChanged: _onNameChanged,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration('Örn: Kampüs Kapında Merkez'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Lütfen çalışma alanı adını girin';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                const Text(
                  'Benzersiz Adres (Slug)',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _slugController,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration('kampus-kapinda-merkez'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Lütfen benzersiz adresi girin';
                    }
                    final slug = value.trim();
                    if (!RegExp(r'^[a-z0-9-]+$').hasMatch(slug)) {
                      return 'Geçersiz adres formatı (Yalnızca küçük harf, sayı ve tire)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                const Text(
                  'Sektör / Kategori',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _selectedIndustry,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration(''),
                  items: const [
                    DropdownMenuItem(value: 'education', child: Text('Eğitim / Üniversite')),
                    DropdownMenuItem(value: 'retail', child: Text('Perakende / Market')),
                    DropdownMenuItem(value: 'operations', child: Text('Lojistik / Operasyon')),
                    DropdownMenuItem(value: 'general', child: Text('Genel İş Ortaklığı')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedIndustry = val;
                      });
                    }
                  },
                ),
                const SizedBox(height: 40),
                ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Oluştur ve Katıl',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      filled: true,
      fillColor: const Color(0xFF1E293B),
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF64748B)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
