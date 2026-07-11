---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kampüs Hub — Architecture Map

Bu doküman, sistemin mevcut ve hedef mimari haritasını, klasör yapılarını ve veritabanı şema sınırlarını tanımlar.

---

## 1. Mevcut Mimari Yapı (Current Architecture)
Proje kök dizini altında şu temel bileşenler yer almaktadır:
* **`apps/mobile`**: Flutter mobil uygulaması. Core katmanında yeni eklenen saf Dart ve veri sarmalayıcı dosyaları şunlardır:
  - `apps/mobile/lib/core/errors/app_failure.dart` *(11 somut hata sınıfı)*
  - `apps/mobile/lib/core/result/app_result.dart` *(AppResult, AppSuccess, AppError sarmalayıcıları)*
  - `apps/mobile/lib/core/errors/failure_mapper.dart` *(Ham Supabase/PostgREST/Auth/platform exception'larını AppFailure tiplerine dönüştürür. UI'ya ham teknik hata sızmasını engeller)*
  - `apps/mobile/lib/core/async/operation_class.dart` *(Uygulama işlemlerini 5 sınıfa ayıran enum)*
  - `apps/mobile/lib/core/async/retry_policy.dart` *(İşlemi çalıştırmadan, yalnızca işlem tipine ve hata tipine göre doNotRetry, retry veya verifyServerState kararını ve üstel gecikmeyi belirler)*
  - `apps/mobile/lib/core/async/timeout_policy.dart` *(İşlem tiplerine göre varsayılan pozitif süreleri seçen const yapılandırma)*
  - **Not**: Bu dosyalar saf Dart ve veri sözleşmesi yapısında olup; Riverpod veya Flutter UI bağımlılıkları taşımaz.
  - Uygulama genelinde Riverpod (state management) ve GoRouter (navigation) kullanmaktadır.
* **`supabase/migrations`**: PostgreSQL şema, tetikleyici ve RPC göç dosyaları.
* **`supabase/tests`**: pgTAP veritabanı birim ve entegrasyon testleri.
* **`docs/`**: Mimari planlar ve doğrulama raporları.

### Mevcut Yetkilendirme Modeli:
* Yetkilendirme artık global `profiles.role` veya `profiles.university_id` üzerinden **yapılmamaktadır**.
* Tüm yetki denetimleri doğrudan **`workspace_members`** tablosundaki `permission_role` ve `job_role` alanları ile bunların ilişkili scope tabloları üzerinden yönetilmektedir.

---

## 2. Hedef Modüler Mobil Mimari (Target Architecture)
* **Önemli Not**: Bu hedef yapı henüz uygulanmamıştır. Milestone 3C-Bridge-C aşamasında bu yapıya geçiş gerçekleştirilecektir.

Uygulamanın dikey dilimlere (Feature-First) ve katmanlı Clean Architecture prensiplerine göre yapılandırılması planlanmıştır:

```text
lib/
├── app/                  # Uygulama ana yapılandırması
│   ├── bootstrap/        # SDK ve Servis ilklendirmeleri (Supabase, Auth vb.)
│   ├── router/           # GoRouter tanımları ve yönlendirme kuralları (guards)
│   ├── theme/            # Ortak renk, font ve stil token'ları
│   └── shell/            # Shell layout ve genel gezinme çubuğu (Bottom Navigation)
├── core/                 # Paylaşılan ortak bağımsız katman (Features bağımlılığı olamaz)
│   ├── config/           # Çevre değişkenleri ve bayraklar (Feature flags)
│   ├── errors/           # AppFailure sınıfları
│   ├── result/           # Result<Success, Failure> sarmalayıcısı
│   ├── network/          # Supabase client soyutlaması
│   ├── security/         # Biometrics & MFA servisleri
│   ├── storage/          # Güvenli yerel depolama (Secure storage)
│   ├── logging/          # Sistem loglama servisi
│   └── widgets/          # Uygulama geneli ortak UI bileşenleri
└── features/             # İş özellikleri (Dikey modüller)
    ├── auth/             # Login ve cihaz kısıtları yönetimi
    ├── onboarding/       # İlk çalışma alanı kurulumu ve davet ekranları
    ├── workspaces/       # Çalışma alanı yönetimi ve switcher paneli
    └── tasks/            # Görevler, alt görevler ve kontrol listeleri
```

### Özellik Modülü İç Yapısı (Clean Feature Layout):
```text
features/your_feature/
├── data/                 # Veri katmanı (Ağ çağrıları, DTO dönüşümleri)
│   ├── data_sources/
│   ├── dto/
│   └── repositories/     # Domain repo arayüzlerinin implementasyonu
├── domain/               # İş mantığı katmanı (Supabase ve UI bağımsız, saf Dart)
│   ├── entities/         # İş modelleri
│   ├── repositories/     # Repository arayüzleri
│   └── use_cases/        # İş kuralları
└── presentation/         # Arayüz katmanı
    ├── providers/        # State yönetimi (Riverpod)
    ├── screens/          # Sayfa görünümleri (UI)
    └── widgets/          # Sayfaya özel yerel widget bileşenleri
```

---

## 3. Çoklu Kiralama Veritabanı Çekirdek Şeması (Core Tenant Tables)
Çoklu kiralama veri güvenliği ve RLS altyapısını sağlayan ana tablolar şunlardır:
1. **`workspaces`**: Çekirdek kiracı tablosudur. Ekiplerin isim, slug ve genel durumlarını tutar.
2. **`workspace_settings`**: Çalışma alanına özel MFA kurallarını, günlük teslim saatlerini ve bildirim sessiz saatlerini barındırır.
3. **`workspace_members`**: Kullanıcıların çalışma alanları ile ilişkilerini, yönetsel yetki rollerini (`permission_role`) ve operasyonel rollerini (`job_role`) tutar.
4. **`workspace_member_university_scopes`**: Üniversite temsilcilerinin görebileceği kampüs yetki sınırlarını eşleştirir (many-to-many).
5. **`workspace_invitations`**: Çalışma alanlarına gönderilen e-posta davetlerini ve token hash'lerini saklar.
6. **`workspace_invitation_university_scopes`**: Davet kabul edildiğinde otomatik atanacak üniversite yetki kapsamlarını önceden eşleştirir.
7. **`pending_task_assignments`**: Henüz kaydolmamış e-posta adreslerine atanan görevlerin, üyelik başladığında otomatik çözümlenmesi için bekletildiği kuyruktur.
