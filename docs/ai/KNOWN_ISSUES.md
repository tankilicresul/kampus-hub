---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kampüs Hub — Known Issues

Bu doküman, sistemde bilinen aktif hataları, eksik entegrasyonları ve geçici çözümleri içerir. Çözülmüş hatalar bu listede yer almaz.

---

## 1. Aktif Entegrasyon ve Altyapı Eksikleri
* **Gerçek Google OAuth Entegrasyonu**: Firebase/Google Console ve Supabase Auth panellerindeki canlı sertifika tanımları henüz bağlanmamıştır. Local simülasyon butonu ile test edilmektedir.
* **Gerçek TOTP/MFA Kaydı**: Çok faktörlü doğrulama (MFA) için kullanıcı cihazında QR kod okutma ve doğrulama akışları mobil uygulamaya bağlanmamıştır. RPC katmanındaki kontroller simüle edilerek doğrulanmaktadır.
* **E-posta Daveti Gönderimi**: Kullanıcı bir workspace'e davet edildiğinde otomatik davet maili gönderen SMTP sunucu entegrasyonu (Supabase Edge Function veya dış servis) henüz kurulmamıştır. Token'lar veritabanından manuel takip edilmektedir.
* **iOS Derleme Doğrulaması**: Mobil uygulamanın iOS/TestFlight derleme ve imzalama yapılandırmaları henüz test edilmemiştir. Geliştirme Android Emulator ağırlıklı sürdürülmektedir.
* **Production Supabase Ortamı**: Canlı veritabanı kurulumu (Supabase Cloud Deployment) yapılmamıştır. Tüm süreç local Docker konteynerleri üzerinde yürütülmektedir.

---

## 2. Kod ve Şema Seviyesindeki Geçici Çözümler (Workarounds)
* **Onboarding ve Yeni RPC'ler**: Flutter onboarding akışı henüz `create_workspace_with_owner`, `list_current_user_pending_workspace_invitations` gibi yeni RPC fonksiyonlarını aktif kullanmamaktadır. Arayüz geçişi Milestone 3C-C aşamasında tamamlanacaktır.
* **Legacy `check_current_user_access` RPC'si**: Eski allowlist yapısını denetleyen bu fonksiyon, Flutter tarafındaki onboarding guard mekanizmaları tamamen yenilenene kadar geriye dönük uyumluluk sağlamak adına silinmemiş, veritabanında tutulmaktadır.
* **Eski Doküman Çelişkileri (Stale Documentation)**: `docs/authentication_architecture.md`, `docs/database_plan.md` ve `docs/device_security.md` gibi eski bazı plan dosyalarında hâlâ global allowlist kısıtlamaları ve `profiles.role` tabanlı eski yetkilendirme modellerinin anlatımı kalmıştır. Bu belgeler referans niteliğinde olup, en güncel kaynak `docs/ai/` altındaki belgelerdir.
