# Milestone 3C-Bridge: AI Project Continuity and Modular Architecture Plan

Bu plan belgesi, Kampüs Hub projesinin geliştirilmesinde kesintisiz yapay zekâ (AI) geçişlerini sağlamak, repo hafızasını sürdürülebilir kılmak ve mobil uygulamayı Clean Architecture prensiplerine göre modüler, hata toleranslı (fault-isolated) ve test edilebilir bir yapıya dönüştürmek için hazırlanmıştır.

---

## 1. Current Documentation Audit (Mevcut Dokümantasyon Denetimi)

Uygulamanın mevcut dokümantasyon yapısı incelendiğinde aşağıdaki çelişki riskleri ve bilgi boşlukları tespit edilmiştir:
- **Tekrarlanan ve Güncel Olmayan Bilgiler**:
  - `docs/authentication_architecture.md` ve `docs/device_security.md` dosyalarında hâlen eski tekil allowlist (`access_invitations`) ve global `profiles.role` tabanlı yetkilendirme modelleri anlatılmaktadır. Ancak multi-workspace yapısı ile bu mekanizmalar `workspace_members` tablosuna taşınmış ve global signup allowlist'ten ayrılmıştır.
  - Farklı milestone implementasyon planları (`docs/milestone_3_implementation_plan.md` ve `docs/milestone_3c_multi_workspace_plan.md`) projenin o anki gerçek ve kararlı durumunu yansıtmamakta, tarihsel süreçleri karıştırma riski barındırmaktadır.
- **Kritik Bilgi Boşlukları (Gaps)**:
  - **Hafıza ve Durum Eksikliği**: Projeyi devralan bir yapay zekânın, veritabanının, testlerin ve ortamların son durumunu görebileceği makine tarafından okunabilir (`project-state.json`) bir durum belgesi yoktur.
  - **Karar Günlüğü (Decisions Log)**: Mimari kararların (ör. `tasks.supporters` alanının şimdilik array tutulması, local secure storage kullanımı vb.) ADR (Architecture Decision Record) standartlarında tutulduğu tekil bir kaynak bulunmamaktadır.
  - **Handoff Protokolü**: Oturumlar arası aktarım yapacak standart bir devir dosyası şablonu bulunmamaktadır.
  - **Hata ve İzolasyon Modeli**: Uygulamada harici servislerin (MFA, Takvim, Bildirim) çökmesi durumunda sistemin nasıl davranacağı ve hata kodlarının nasıl yönetileceği tanımlanmamıştır.

---

## 2. AI Continuity Architecture (Yapay Zekâ Kesintisiz Geçiş Mimarisi)

Farklı oturumlarda farklı AI modellerinin projeyi devralması durumunda bağlam (context) kaybını sıfıra indirmek amacıyla `docs/ai/` dizini altında bir **AI Project Memory System** tasarlanmıştır.

### Dosya Kapsamları ve Sorumlulukları:
1. **`docs/ai/AI_START_HERE.md`**: Projeyi devralan geliştiricinin/AI'ın ilk okuması gereken rehberdir. Geliştirici protokollerini ve katı kuralları barındırır.
2. **`docs/ai/PROJECT_MEMORY.md`**: Projenin iş modeli, kullanıcı rolleri, workspace mantığı ve ana akışlarının tarihsel ve kavramsal özetidir.
3. **`docs/ai/CURRENT_STATE.md`**: En son tamamlanan aksiyonlar, derleme durumları ve mevcut hedefler gibi dinamik verileri içerir.
4. **`docs/ai/DECISIONS.md`**: Alınan tüm mimari kararların (ADR) ve reddedilen alternatiflerin listesidir.
5. **`docs/ai/ARCHITECTURE_MAP.md`**: Flutter klasör yapısının, bağımlılık sınırlarının ve Supabase şema sınırlarının haritasıdır.
6. **`docs/ai/WORKFLOW_RULES.md`**: Kod yazma, hata yönetimi, trigger kuralları ve test yazım standartlarını barındırır.
7. **`docs/ai/KNOWN_ISSUES.md`**: Bilinen açık bug'lar ve bunların geçici çözümleridir.
8. **`docs/ai/TECHNICAL_DEBT.md`**: İleride refaktör edilmesi gereken teknik borçlar günlüğüdür.
9. **`docs/ai/ROADMAP.md`**: Projenin uzun vadeli milestone planlarıdır.
10. **`docs/ai/TEST_STATUS.md`**: Veritabanı ve Flutter testlerinin son başarılı çalışma logları ve kapsam oranlarıdır.
11. **`docs/ai/HANDOFF_TEMPLATE.md`**: Oturum sonlarında üretilecek standart devir şablonudur.
12. **`docs/ai/project-state.json`**: Makine tarafından okunabilir durum parametreleridir.

---

## 3. Source-of-Truth Matrix (Tek Gerçek Kaynak Matrisi)

Bilgi çelişkilerini önlemek için her veri tipinin tek bir source of truth (gerçek kaynak) belgesi tanımlanmıştır:

| Bilgi / Veri | Tek Gerçek Kaynak (Source of Truth) | Tarihsel/Yardımcı Kayıt (Secondary) |
| :--- | :--- | :--- |
| **Mevcut / Sıradaki Milestone** | `docs/ai/project-state.json` | `task.md` |
| **Ürün Gereksinimleri** | `docs/ai/PROJECT_MEMORY.md` | `docs/milestone_3c_multi_workspace_plan.md` |
| **Mimari Kararlar (ADR)** | `docs/ai/DECISIONS.md` | `docs/architecture_decisions.md` (Legacy) |
| **Veritabanı Şeması** | Aktif migration SQL dosyaları | `docs/database_plan.md` |
| **Doğrulama / Test Sonuçları** | `docs/ai/TEST_STATUS.md` | `walkthrough.md` & `WORKLOG.md` |
| **Bilinen Sorunlar** | `docs/ai/KNOWN_ISSUES.md` | Chat geçmişi |
| **Teknik Borçlar** | `docs/ai/TECHNICAL_DEBT.md` | `docs/milestone_3c_rls_rpc_report.md` |
| **Kullanıcı Yetki Modeli** | `20260712030000_multi_workspace_rls_and_apis.sql` | `docs/ai/PROJECT_MEMORY.md` |

---

## 4. AI Onboarding / Read Order (Yapay Zekâ Okuma Sırası)

Yeni bir yapay zekânın projeye en hızlı ve çelişkisiz şekilde adapte olması için izleyeceği zorunlu okuma sırası:
1. `docs/ai/AI_START_HERE.md` *(Katı kurallar ve ilk yönergeler)*
2. `docs/ai/project-state.json` *(Makine tarafından okunabilir parametreler)*
3. `docs/ai/CURRENT_STATE.md` *(Mevcut durum ve bir sonraki adım)*
4. `docs/ai/DECISIONS.md` *(Mimari ADR sınırları)*
5. `docs/ai/PROJECT_MEMORY.md` *(Ürün ve iş modeli)*
6. `docs/ai/ARCHITECTURE_MAP.md` *(Klasör ve şema haritası)*
7. `task.md` *(Genel TODO listesi)*
8. Son `WORKLOG.md` kayıtları *(Son yapılanlar)*

### AI_START_HERE Zorunlu Kuralları:
- Kullanıcı teknik değildir; adımlar tek tek ve küçük parçalar halinde sunulmalıdır.
- Kullanıcı çıktı veya ekran görüntüsü doğrulamadan sonraki adıma geçilmemelidir.
- Kullanıcı açıkça onaylamadan git commit veya git push yapılmamalıdır.
- Eski migration dosyaları geriye dönük değiştirilmemelidir.
- Bir test başarısızsa, o hata çözülmeden asla yeni doğrulama veya geliştirme adımına geçilmemelidir.

---

## 5. Machine-Readable State Schema (project-state.json)

`docs/ai/project-state.json` dosyası için kesin JSON şeması:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProjectState",
  "type": "OBJECT",
  "required": [
    "projectName", "productVersion", "currentMilestone", "currentMilestoneStatus",
    "nextMilestone", "lastUpdated", "database", "flutter", "environments",
    "git", "nextExactStep", "prohibitedActions"
  ],
  "properties": {
    "projectName": { "type": "STRING" },
    "productVersion": { "type": "STRING" },
    "currentMilestone": { "type": "STRING" },
    "currentMilestoneStatus": { "type": "STRING", "enum": ["pending", "in_progress", "completed", "failed"] },
    "nextMilestone": { "type": "STRING" },
    "lastUpdated": { "type": "STRING", "format": "date-time" },
    "database": {
      "type": "OBJECT",
      "required": ["migrationStatus", "testCount", "passedTests", "failedTests", "lintErrors", "lintWarnings", "schemaDiff"],
      "properties": {
        "migrationStatus": { "type": "STRING" },
        "testCount": { "type": "INTEGER" },
        "passedTests": { "type": "INTEGER" },
        "failedTests": { "type": "INTEGER" },
        "lintErrors": { "type": "INTEGER" },
        "lintWarnings": { "type": "INTEGER" },
        "schemaDiff": { "type": "STRING" }
      }
    },
    "flutter": {
      "type": "OBJECT",
      "required": ["testCount", "passedTests", "failedTests", "analyzeStatus"],
      "properties": {
        "testCount": { "type": "INTEGER" },
        "passedTests": { "type": "INTEGER" },
        "failedTests": { "type": "INTEGER" },
        "analyzeStatus": { "type": "STRING" }
      }
    },
    "environments": {
      "type": "OBJECT",
      "required": ["localSupabase", "androidEmulator", "productionSupabase", "ios"],
      "properties": {
        "localSupabase": { "type": "STRING" },
        "androidEmulator": { "type": "STRING" },
        "productionSupabase": { "type": "STRING" },
        "ios": { "type": "STRING" }
      }
    },
    "git": {
      "type": "OBJECT",
      "required": ["branch", "commitAllowed", "pushAllowed", "workingTreeKnown"],
      "properties": {
        "branch": { "type": "STRING" },
        "commitAllowed": { "type": "BOOLEAN" },
        "pushAllowed": { "type": "BOOLEAN" },
        "workingTreeKnown": { "type": "BOOLEAN" }
      }
    },
    "nextExactStep": { "type": "STRING" },
    "prohibitedActions": { "type": "ARRAY", "items": { "type": "STRING" } }
  }
}
```

---

## 6. Decision Logging Model (ADR Formatı)

Mimari Karar Kayıtları (`docs/ai/DECISIONS.md`), aşağıdaki formatta tutulacaktır:
- **Decision ID**: ADR-XXX
- **Date**: YYYY-MM-DD
- **Status**: Proposed / Approved / Rejected / Deprecated
- **Context**: Kararın verilmesini gerektiren teknik veya işsel arka plan.
- **Decision**: Alınan kesin teknik karar.
- **Reason**: Bu kararın seçilme gerekçesi.
- **Rejected Alternatives**: Reddedilen diğer seçenekler ve neden elendikleri.
- **Consequences**: Kararın sisteme getirdiği yeni kısıtlar, avantajlar veya riskler.
- **Affected Components**: Karardan etkilenen Flutter modülleri ve veritabanı tabloları.
- **Migration Impact**: Veritabanı göç süreçlerine etkisi.
- **Test Impact**: Test stratejisine etkisi.

---

## 7. Handoff Protocol (Devir Protokolü)

Oturum sonlarında geliştirici veya yapay zekâ, `docs/ai/handoffs/YYYY-MM-DD-HHMM-handoff.md` adıyla bir devir dosyası üretecektir.

### Handoff İçeriği:
1. **Current Objective**: Oturumun ana hedefi neydi?
2. **Last Completed Milestone / Action**: En son tamamlanan milestone ve aksiyon.
3. **Current Test Status**: Son test komutu çıktı özetleri.
4. **Last Successful / Failing Commands**: Çalışan ve hata veren son komutlar.
5. **Files Changed / Not to Change**: Değiştirilen dosyalar ve kesinlikle dokunulmaması gereken alanlar.
6. **Known Blockers / Uncommitted Changes**: Kalan engeller ve commit edilmemiş değişiklikler.
7. **Exact Next Action**: Projeyi devralan kişinin atacağı ilk kesin adım nedir?
8. **Technical Debt Created**: Bu oturumda bilerek bırakılan teknik borçlar.

---

## 8. Current Flutter Architecture Assessment (Mevcut Durum Analizi)

Mevcut Flutter uygulaması (`apps/mobile/lib`) genel hatlarıyla Riverpod ve GoRouter kullanan katmanlı bir yapıya sahip olsa da Clean Architecture standartlarına göre bazı sınır belirsizlikleri barındırmaktadır:
- UI ekranları içerisinde doğrudan Supabase client çağrıları yapılabilmektedir.
- Modüller (Örn: auth ve dashboard) arası veri aktarımlarında ve bağımlılıklarında (coupling) kesin kurallar tanımlanmamıştır.
- Servislerin çökmesi durumunda tüm ekranın donmasını veya kilitlenmesini engelleyecek hata izolasyon (fault-isolation) katmanları eksiktir.

---

## 9. Target Modular Architecture (Hedef Modüler Mimari)

Flutter projesi, Clean Architecture tabanlı **Feature-First** (Özellik odaklı) modüler bir yapıya kavuşturulacaktır:

```text
lib/
├── app/                  # Uygulama ana giriş ve yapılandırması
│   ├── bootstrap/        # Supabase, Riverpod, LocalAuth init
│   ├── router/           # GoRouter tanımları ve Onboarding redirect guard'ları
│   ├── theme/            # Renk ve font token'ları
│   └── shell/            # Shell layout ve genel alt menü (Navigation bar)
├── core/                 # Paylaşılan ortak kütüphaneler (Hiçbir feature'a bağımlı olamaz)
│   ├── config/           # Çevre değişkenleri
│   ├── errors/           # AppFailure sınıfları
│   ├── result/           # Result<Success, Failure> sarmalayıcısı
│   ├── network/          # Supabase client soyutlaması
│   ├── security/         # Biometrics & MFA servisleri
│   ├── storage/          # Secure storage servisleri
│   ├── logging/          # Sistem loglama servisi
│   └── widgets/          # Ortak UI bileşenleri (Buttons, Textfields)
└── features/             # İş özellikler modülleri (Dikey dilimler)
    ├── auth/             # Login, Google OAuth ve active device check
    │   ├── data/
    │   ├── di/
    │   │   └── auth_dependencies.dart
    │   ├── domain/
    │   └── presentation/
    ├── onboarding/       # Workspace davetleri kabul ve yeni workspace oluşturma
    ├── workspaces/       # Workspace switcher ve ayarlar
    └── tasks/            # Görevler, subtask'ler ve checklists
```

### Feature Alt Klasör Yapısı (Clean Architecture):
```text
features/some_feature/
├── data/
│   ├── data_sources/     # Supabase API veya local database çağrıları
│   ├── dto/              # Veritabanı nesneleri (JSON serialization)
│   └── repositories/     # Domain repo arayüzlerini implemente eden sınıflar
├── domain/
│   ├── entities/         # Temel iş modelleri (Sadece saf Dart, Supabase/UI bağımlılığı yok)
│   ├── repositories/     # Repository arayüzleri (Interface'ler)
│   └── use_cases/        # İş kuralları senaryoları (Örn: AcceptInvitationUseCase)
└── presentation/
    ├── providers/        # StateNotifier ve Riverpod state yönetimleri
    ├── screens/          # Sayfa görünümleri (UI)
    └── widgets/          # Sayfaya özel yerel widget'lar
```

---

## 10. Dependency Rules (Bağımlılık Kuralları)

Modüller arası bağımlılık karmaşasını ve dairesel bağımlılıkları (circular dependency) önlemek için aşağıdaki katı kurallar uygulanacaktır:
1. **Tek Yönlü Bağımlılık**: `Presentation` katmanı yalnızca `Domain` (Use Cases/Entities) katmanına bağımlı olabilir. `Domain` katmanı ise altındaki veya üstündeki hiçbir katmana (Data, Presentation, Supabase, UI paketleri) bağımlı olamaz (Saf Dart).
2. **Implementasyon Sınırı**: `Data` katmanı, `Domain` katmanında tanımlanan Repository arayüzlerini (interface) implemente eder.
3. **Feature İzolasyonu**: Özellikler (features) birbirlerinin veri katmanlarını veya provider'larını doğrudan import edemezler. İletişim sadece `Domain` seviyesindeki ortak modeller veya `core` üzerinden sağlanabilir.
4. **Supabase İzolasyonu**: Ekranlarda (UI) ve Provider'larda doğrudan `SupabaseClient` veya ham Postgrest sorguları bulunamaz. Tüm veri işlemleri Repository arayüzleri arkasına gizlenmelidir.

---

## 11. Repository Contracts (Repository Sözleşmeleri)

Uygulamanın veri katmanı, testlerde mock'lanabilmesi ve çevrimdışı (offline cache) desteklerine hazır olması için aşağıdaki gibi arayüzler (abstract class) üzerinden soyutlanacaktır:

```dart
abstract class AuthRepository {
  Future<Result<UserProfile, AppFailure>> signInWithGoogle();
  Future<Result<void, AppFailure>> registerDevice(DeviceMetadata device);
  Future<Result<List<UserDevice>, AppFailure>> getActiveDevices();
  Future<Result<void, AppFailure>> revokeDevice(String deviceId);
}

abstract class WorkspaceRepository {
  Future<Result<WorkspaceInfo, AppFailure>> createWorkspace(WorkspaceDraft draft);
  Future<Result<List<WorkspaceInfo>, AppFailure>> getWorkspaces();
  Future<Result<void, AppFailure>> setActiveWorkspace(String workspaceId);
  Future<Result<void, AppFailure>> transferOwnership(String workspaceId, String targetMemberId);
}
```

---

## 12. Error Model (Standart Hata Yönetimi)

Uygulama genelinde ham veritabanı veya ağ hatalarının arayüze sızmasını engellemek için `AppFailure` hiyerarşisi kullanılacaktır:

```text
AppFailure
├── NetworkFailure               # İnternet bağlantı sorunları
├── TimeoutFailure               # RPC/İstek zaman aşımı
├── AuthenticationFailure        # JWT/Oturum eksikliği veya geçersizliği
├── PermissionFailure            # Yetkisiz işlem denemesi (42501 RLS engelleri)
├── ValidationFailure            # Arayüz veya veritabanı doğrulama hataları
├── ConflictFailure              # Unique constraints/Duplicate key hataları (23505)
└── UnknownFailure               # Beklenmeyen sistem hataları
```

- **Uygulama Kuralı**: Ham `PostgrestException` veya `SocketException` nesneleri Repository katmanında yakalanarak uygun `AppFailure` tipine dönüştürülür ve UI tarafına sadece bu nesne taşınır. Kullanıcıya hiçbir zaman ham SQL hata kodları gösterilmez.

---

## 13. Fault-Isolation Strategy (Hata İzolasyon Stratejisi)

Harici servislerin çökmesi durumunda uygulamanın genelinin kilitlenmesini önlemek için uygulanacak izolasyon stratejileri:

1. **Notification Servisi Hatası**: Yeni cihaz kaydedilirken bildirim atılamazsa veya bildirim servisi hata verirse, cihaz kaydı rollback edilmez; işlem başarılı sayılır ve hata arka planda loglanır (Graceful degradation).
2. **MFA Entegrasyonu Hatası**: MFA doğrulama servisi çökerse, kullanıcının workspace verilerine erişimi RLS tarafından engellenmeye devam eder; ancak kullanıcı ana onboarding ekranına güvenli şekilde yönlendirilip servis durumu bildirilir.
3. **RPC Zaman Aşımları**: Her RPC isteği için 10 saniyelik zaman aşımı (timeout) uygulanır. Zaman aşımında otomatik 3 kez üst üste retry (yeniden deneme) mekanizması devreye girer. Başarısızlık durumunda kullanıcıya "Bağlantı geçici olarak kurulamadı" uyarısı gösterilir.
4. **Çevrimdışı Durum**: İnternet bağlantısı koptuğunda, ekranlar sonsuz yüklemede (loading) kalmamalı; doğrudan `offline` hata sayfasına veya cache'lenmiş verilere yönlendirilmelidir.

---

## 14. Feature Flag Strategy (Özellik Bayrağı Stratejisi)

İşlevleri uzaktan veya yerel olarak açıp kapatabilmek için feature flag yapısı planlanmıştır:
* **Global Flags**: Google login allowlist etkinliği, sistem bakım modu gibi tüm platformu etkileyen bayraklar.
* **Workspace-level Flags**: Workspace bazlı `calendar_enabled`, `file_uploads_enabled` veya `performance_enabled` gibi özellikler.
* **Uygulama Biçimi**: Bayraklar pasif olduğunda, arayüzdeki ilgili modül butonları gizlenir, GoRouter seviyesinde rotalara erişim engellenir ve veritabanı RLS politikaları istekleri otomatik olarak bloke eder.

---

## 15. Supabase Modularity Standards (Supabase Modülerlik Standartları)

Supabase üzerinde yapılacak geliştirmelerde karmaşayı önlemek için uygulanacak standartlar:
* **Migration Dosyaları Adlandırma**: `YYYYMMDDHHMMSS_feature_description.sql` formatı sürdürülecektir.
* **Modüler Yapı**: Büyük migration dosyaları yazmak yerine, değişiklikler dikey olarak bölünerek uygulanacaktır (Foundation -> Constraints -> RLS -> RPC -> Fixes).
* **RPC Standartları**:
  - `auth.uid()` ve `auth.jwt()` fonksiyonları ile kullanıcı doğrulaması doğrudan Postgres seviyesinde yapılmalıdır; istemciden parametre olarak `user_id` alınmamalıdır.
  - Her RPC fonksiyonu kesinlikle `SECURITY DEFINER` ve dar `search_path` (örn: `SET search_path = public, pg_catalog`) ile çalıştırılmalıdır.
  - Her yazma işleminde ilgili workspace için `audit_logs` tablosuna kayıt atılmalıdır.

---

## 16. Testing Standards (Test Standartları)

Uygulamanın doğrulanmasında test piramidi kuralları geçerlidir:
1. **Domain Unit Tests**: Use case ve entity nesnelerinin saf Dart testleri.
2. **Repository Tests**: Veri getirme, DTO dönüştürme ve hata (Failure) eşleme testleri (mock API ile).
3. **Provider/State Tests**: State değişimlerinin ve Riverpod bildirimlerinin doğruluğu.
4. **Supabase pgTAP Tests**: Tüm RLS politikaları, trigger kısıtları ve RPC fonksiyonları pgTAP ile test edilmeye devam edilecektir.
5. **Kapsam Kuralı**: Bir özelliğin (feature) bitti sayılması için happy path, empty state ve error state senaryolarının test edilmiş olması zorunludur.

---

## 17. Feature README Standards (Modül README Şablonu)

Her modülün altında `features/<feature_name>/README.md` dosyası oluşturulacaktır.

### README İçeriği:
- **Purpose**: Modülün amacı ve çözdüğü iş problemi.
- **User Flows**: Kullanıcı etkileşim adımları.
- **Public API / Providers**: Dışarıya sunulan Riverpod sağlayıcıları ve metotlar.
- **Dependencies**: Modülün bağımlı olduğu diğer features veya core paketler.
- **Error States & Fallbacks**: Hata durumlarında gösterilecek fallback ekranları.
- **Feature Flags**: Modüle etki eden özellik bayrakları.

---

## 18. Memory Update Protocol (Hafıza Güncelleme Protokolü)

Her milestone tamamlandığında veya mimari kararlarda değişiklik yapıldığında aşağıdaki dosyaların güncellenmesi zorunludur:

| Tetikleyici Olay | Güncellenmesi Zorunlu Dosyalar |
| :--- | :--- |
| **Milestone Sonu** | `docs/ai/CURRENT_STATE.md`, `docs/ai/project-state.json`, `docs/ai/TEST_STATUS.md`, `task.md`, `WORKLOG.md` |
| **Mimari Karar / Değişiklik** | `docs/ai/DECISIONS.md`, `docs/ai/PROJECT_MEMORY.md`, `docs/ai/ARCHITECTURE_MAP.md` |
| **Bug / Teknik Borç Tespiti** | `docs/ai/KNOWN_ISSUES.md`, `docs/ai/TECHNICAL_DEBT.md` |

Her dosyanın başında `Last Updated`, `Updated by` ve `Related Milestone` bilgileri güncel tutulmalıdır.

---

## 19. Conflict-Resolution Rules (Çelişki Çözüm Kuralları)

Dokümanlar arasında uyumsuzluk veya çelişki olması durumunda uygulanacak öncelik sırası:
1. **Aktif veritabanı şeması ve pgTAP test kodları** *(En yüksek öncelik)*
2. `docs/ai/project-state.json`
3. `docs/ai/CURRENT_STATE.md`
4. `docs/ai/DECISIONS.md`
5. `task.md`
6. `WORKLOG.md`

*Not*: Kod ile ürün gereksinimi çelişiyorsa, kod otomatik olarak doğru kabul edilmez. Sorun derhal "Issue" olarak raporlanmalı ve kullanıcı onayı alınmalıdır.

---

## 20. Incremental Implementation Phases (Kademeli Geçiş Aşamaları)

Mevcut sistemi bozmadan ve kesintisiz geliştirme sağlamak için bridge aşaması 6 alt faza bölünmüştür:

### Phase 3C-Bridge-A: AI Memory Documents
- **Scope**: `docs/ai/` klasörünün oluşturulması ve 12 temel hafıza dosyasının yazılması.
- **Files**: `docs/ai/*`
- **Risk**: Yok.
- **Test**: Doküman format doğrulaması.
- **Rollback**: Klasörün silinmesi.

### Phase 3C-Bridge-B: Architecture Boundaries & Error Contracts
- **Scope**: `AppFailure` modellerinin, `Result` tipinin ve feature sınır kurallarının `core/` altında tanımlanması.
- **Files**: `apps/mobile/lib/core/errors/*`, `apps/mobile/lib/core/result/*`
- **Risk**: Düşük.
- **Test**: Dart unit test.
- **Rollback**: Dosyaların silinmesi.

### Phase 3C-Bridge-C: Flutter Folder Refactor (No Behavior Change) (Completed / Tamamlandı)
- **Scope**: Mevcut Flutter dosyalarının (tema, router, testler, MaterialApp root), davranış değişikliği yapılmadan hedeflenen modüler klasör yapısına taşınması.
- **Doğrulama**: SHA-256 doğrulandı, eski referanslar 100% temizlendi. 161/161 Flutter testi, 60/60 pgTAP DB testi, git diff --check kontrolleri başarıyla tamamlandı.

### Phase 3C-Bridge-D: Repository Isolation (Completed / Tamamlandı)
- **Scope**: UI katmanındaki ve Provider'lardaki doğrudan Supabase Client çağrılarının kaldırılması ve Repository arayüzleri arkasına taşınması.
- **Alt Aşamalar**:
  - **Phase 3C-Bridge-D1 (Provider Dependency Extraction)**: **Completed (Tamamlandı)** (Riverpod provider'ları DI dosyasına taşındı, presentation altyapı bağımlılıkları temizlendi).
  - **Phase 3C-Bridge-D2 (Dependency-Boundary Verification)**: **Completed (Tamamlandı)** (Kalan altyapı bağımlılıklarının analizi yapıldı, ek soyutlamaya gerek kalmadan presenter'ın tamamen yalıtıldığı tescil edildi).
- **Doğrulama**: widget ve router testlerini koşturma, dependency-boundary envanterinin çıkarılması.

### Phase 3C-Bridge-E: Feature Flags & Graceful Degradation (Completed / Tamamlandı)
- **Scope**: Özellik bayrağı semantiğinin güvenlik sınırlarının analiz edilmesi ve release derlemelerindeki bypass zafiyetlerinin `kDebugMode` fail-closed guard'ları ile tamamen kapatılması.
- **Doğrulama**: simulate=true, MFA placeholder buton geçişi ve DebugSimulationControls release modda test edilerek doğrulanmıştır. 161/161 Flutter testi başarıyla geçmiştir.

### Phase 3C-Bridge-F: Documentation & Verification Closure (Completed / Tamamlandı)
- **Scope**: Modüler sınırların ve entegre veri/hata modellerinin dokümante edilmesi, kullanılmayan dosyaların temizliği ve final release-readiness envanter tescili.
- **Doğrulama**: git diff --check, 161/161 Flutter testleri, linter analizi ve database test durumları tescil edilmiştir.

---

## 21. Files Expected to be Created (Oluşturulacak Dosyalar)
- `docs/ai/AI_START_HERE.md`
- `docs/ai/PROJECT_MEMORY.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/ARCHITECTURE_MAP.md`
- `docs/ai/WORKFLOW_RULES.md`
- `docs/ai/KNOWN_ISSUES.md`
- `docs/ai/TECHNICAL_DEBT.md`
- `docs/ai/ROADMAP.md`
- `docs/ai/TEST_STATUS.md`
- `docs/ai/HANDOFF_TEMPLATE.md`
- `docs/ai/project-state.json`
- `apps/mobile/lib/core/errors/app_failure.dart`
- `apps/mobile/lib/core/result/result.dart`
- `apps/mobile/lib/features/auth/di/auth_dependencies.dart`
- `features/<each_feature>/README.md`

---

## 22. Files Expected to be Modified (Düzenlenecek Dosyalar)
- `WORKLOG.md`
- `task.md`
- `walkthrough.md`
- `apps/mobile/pubspec.yaml`
- `apps/mobile/lib/main.dart`
- `apps/mobile/lib/app.dart`
- `apps/mobile/lib/core/router/app_router.dart`
- `apps/mobile/lib/features/auth/presentation/auth_state_notifier.dart`

---

## 23. Risks (Riskler)
- **Import Kırılmaları**: Klasör yapısı taşınırken dosya yollarının (imports) bozulma riski vardır. `flutter analyze` ile sıkı denetim yapılacaktır.
- **GoRouter Rota Uyumsuzlukları**: Ekran yolları değiştiğinde yönlendirme guards mekanizmalarının bozulma riski bulunur. Widget ve router testleri her taşımadan sonra koşturulacaktır.
- **Eşzamanlı Geliştirme Çakışmaları**: Dokümantasyon güncellenirken kullanıcı veya başka bir agent tarafından yapılabilecek paralel kod güncellemeleri.

---

## 24. Acceptance Criteria (Kabul Kriterleri)
1. Tüm `docs/ai/` klasörü ve 12 adet hafıza dosyası eksiksiz oluşturulmuş olmalıdır.
2. `project-state.json` şemaya tam uyumlu olmalıdır.
3. Flutter uygulaması `apps/mobile/lib` altındaki feature-first yapısına hatasız şekilde taşınmış olmalı, dairesel bağımlılık barındırmamalıdır.
4. UI ekranları doğrudan Supabase Client sarmalayıcılarını kullanmayı bırakmış, Repository interface'leri üzerinden haberleşiyor olmalıdır.
5. `flutter analyze` **sıfır hata/uyarı** vermelidir.
6. `flutter test` ve `npx supabase test db` testlerinin tamamı **yeşil (PASS)** olmalıdır.
