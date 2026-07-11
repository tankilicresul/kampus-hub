import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth_state_notifier.dart';

class DebugSimulationControls extends ConsumerWidget {
  const DebugSimulationControls({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authNotifier = ref.read(authStateProvider.notifier);

    return Column(
      children: [
        const Divider(color: Color(0xFFCCCCCC), height: 32),
        const Text(
          'Geliştirici Simülasyon Girişleri (Sadece Debug Modunda)',
          style: TextStyle(
            color: Color(0xFF666666),
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            _SimulateBtn(
              label: 'Yönetici (Admin)',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'resultankilic.business@gmail.com',
              ),
            ),
            _SimulateBtn(
              label: 'Normal Ekip',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'operations@test.com',
              ),
            ),
            _SimulateBtn(
              label: 'Temsilci (Uni Rep)',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'representative@test.com',
              ),
            ),
            _SimulateBtn(
              label: 'Davet Edilmemiş',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'notinvited@test.com',
              ),
            ),
            _SimulateBtn(
              label: 'Pasif Kullanıcı',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'inactive@test.com',
              ),
            ),
            _SimulateBtn(
              label: 'Süresi Dolmuş',
              onPressed: () => authNotifier.signInWithGoogle(
                simulate: true,
                mockEmail: 'expired@test.com',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SimulateBtn extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _SimulateBtn({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFFEEEEEE),
        foregroundColor: const Color(0xFF333333),
        minimumSize: const Size(120, 36),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
