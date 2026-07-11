import 'package:flutter/material.dart';

class DevelopmentConfigurationMissingScreen extends StatelessWidget {
  const DevelopmentConfigurationMissingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF8F9FA), // Neutral light bg
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.warning_amber_rounded,
                size: 80,
                color: Color(0xFF6C757D), // Neutral accent
              ),
              SizedBox(height: 24),
              Text(
                'Yapılandırma Eksik',
                style: TextStyle(
                  color: Color(0xFF212529),
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 16),
              Text(
                'Supabase URL veya Anon Key yapılandırması eksik ya da geçersiz. Lütfen "lib/core/constants/constants.dart" dosyasını kontrol edin ve geçerli yerel Supabase kimlik bilgilerini tanımlayın.',
                style: TextStyle(color: Color(0xFF495057), fontSize: 14),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 24),
              Card(
                color: Color(0xFFE9ECEF),
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text(
                    'Güvenlik Uyarısı:\nÜretim ortamı (production) anahtarlarını veya servis rolü (service_role) şifrelerini asla kod havuzuna (repository) eklemeyin.',
                    style: TextStyle(
                      color: Color(0xFF495057),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
