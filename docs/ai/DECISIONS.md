---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kampüs Hub — Architecture Decisions (ADR)

Bu doküman, Kampüs Hub projesinde alınan mimari kararları, bu kararların gerekçelerini ve etkilerini kayıt altında tutar.

---

## ADR-001: Flutter + Supabase Seçimi
* **Date**: 2026-07-10
* **Status**: Approved
* **Context**: Hızlı MVP üretimi, hem Android hem iOS platformlarının tek kod tabanından desteklenmesi, gerçek zamanlı veritabanı dinleme ihtiyaçları ve hazır bir yetkilendirme (Auth) altyapısının gerekliliği.
* **Decision**: Uygulamanın mobil katmanında **Flutter**, backend/veritabanı katmanında ise **Supabase** (PostgreSQL) kullanılmasına karar verilmiştir.
* **Reason**: Supabase RLS (Row-Level Security) yetenekleri, veritabanı seviyesinde veri güvenliği sağlayarak backend yazım yükünü azaltır.
* **Consequences**: Mobil kod ile veritabanı güvenliği çok sıkı şekilde bağlanmıştır. Supabase client bağımlılıkları doğru yönetilmelidir.

---

## ADR-002: Multi-Workspace SaaS Modeline Geçiş
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Başlangıçta sadece tekil operasyon (Kampüs Kapında) için tasarlanan veritabanının, farklı şirket ve organizasyonların da kendi alanlarını kurabileceği bir yapıya evrilme ihtiyacı.
* **Decision**: Sistem genelinde **Multi-Tenant (Multi-Workspace)** mimarisi uygulanmıştır. Her veri satırı doğrudan veya dolaylı olarak bir `workspace_id` UUID alanına bağlanmıştır.
* **Reason**: Yatay ölçeklenebilirlik, veri izolasyonu ve SaaS satış modeline uygunluk sağlanması.
* **Consequences**: RLS kuralları ve tüm SQL sorguları artık `workspace_id` filtresine tabidir.

---

## ADR-003: Global Signup'ın Legacy Allowlist'ten Ayrılması
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Eski yapıda kullanıcılar üye olurken doğrudan allowlist tablosunda (`access_invitations`) e-postaları sorgulanıyor ve yoksa kayıt engelleniyordu. SaaS modelinde bu durum global üye kazanımını engellemektedir.
* **Decision**: Kullanıcıların global hesap açma (signup) adımı allowlist kısıtlamasından çıkarılmıştır. İsteyen herkes hesap açabilir. Kayıt olan kullanıcılar varsayılan olarak kısıtlı `'intern'` rolüne sahip bir profile sahip olur ve hiçbir çalışma alanına doğrudan üye yapılmazlar.
* **Reason**: SaaS modelinde kullanıcıların bağımsız hesap açabilmesi ve daha sonra davetle ekiplere katılması gerekliliği.
* **Consequences**: `handle_new_user` tetikleyici fonksiyonu güncellenmiştir. Davetsiz kayıt olan kullanıcılar için onboarding ekran yönlendirmesi şart olmuştur.

---

## ADR-004: Permission Role ve Job Role Ayrımı
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Kullanıcıların yönetsel yetki hakları ile (Örn: Admin, Member) operasyonel meslek rolleri (Örn: Operations, Representative) birbirine karışmaktaydı.
* **Decision**: Roller ikiye bölünmüştür: `workspace_members` üzerinde **`permission_role`** (yönetsel haklar) ve **`job_role`** (operasyonel mesleki roller) ayrı kolonlar olarak yönetilir.
* **Reason**: Yönetsel yetki kısıtlamalarının (RLS) temiz tutulması ve aynı zamanda operasyon rollerine göre detaylı iş kurallarının işletilebilmesi.
* **Consequences**: RLS kuralları sadece `permission_role` kontrol ederken, iş mantığı triggers katmanı `job_role` bazlı kısıtlamalar uygulayabilmektedir.

---

## ADR-005: Workspace Tabanlı Server-side RLS
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: İstemci katmanından (Flutter) gelen veri taleplerinde diğer workspace verilerinin sızmasının (leak) önlenmesi ihtiyacı.
* **Decision**: Tüm kiralanabilir veri tablolarına database düzeyinde RLS politikaları eklenmiştir. `is_active_workspace_member(workspace_id)` kontrolü ile sadece aktif üyelerin veri okumasına/yazmasına izin verilmiştir.
* **Reason**: Veri izolasyonunun veritabanı seviyesinde kesin olarak garanti altına alınması.
* **Consequences**: RLS politikası taşımayan yeni tabloların eklenmesi güvenlik açığı oluşturacağından, RLS uygulaması zorunlu kılınmıştır.

---

## ADR-006: Üniversite Scope'unun Many-to-Many Olması
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Bir üniversite temsilcisinin (`university_representative`) birden fazla kampüsten sorumlu olabilmesi ihtiyacı.
* **Decision**: `workspace_member_university_scopes` adında bir many-to-many ara tablosu oluşturulmuştur.
* **Reason**: Tekil üniversite atamasının getirdiği kısıtlılığın giderilmesi ve esnek kampüs yönetimi.
* **Consequences**: RLS kurallarındaki üniversite filtreleri `EXISTS` ve alt sorgularla (JOIN) yazılmaya başlanmıştır.

---

## ADR-007: Owner Guard ve Güvenli Ownership Transfer
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Bir çalışma alanının sahipsiz (Owner'sız) kalmasının, faturalandırma ve yönetim krizlerine yol açma riski.
* **Decision**: `workspace_members` tablosuna `tr_workspace_members_owner_guard` trigger'ı eklenmiştir. Bir workspace'teki son aktif Owner'ın silinmesi, rolünün düşürülmesi veya askıya alınması veritabanı seviyesinde bloke edilmiştir. Sahiplik devri ise `transfer_workspace_ownership` RPC'si üzerinden transaksiyonel olarak zorunlu kılınmıştır.
* **Reason**: Çalışma alanlarının yönetimsel bütünlüğünün korunması.
* **Consequences**: Üye güncellemelerinde ve sahiplik devrinde `workspaces` tablosunda `FOR UPDATE` ile pessimistic locking uygulanır.

---

## ADR-008: Global ve Workspace Notification Ayrımı
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Kullanıcı bir workspace'e henüz üye olmamışken gelen cihaz bildirimlerinin, workspace kısıtları nedeniyle gösterilememesi sorunu.
* **Decision**: Bildirimler `notification_scope` kolonu ile `global` ve `workspace` olarak ikiye ayrılmıştır. Global bildirimlerin `workspace_id` alanı NULL tutulur ve RLS kuralları üyelik aramaksızın doğrudan alıcıya (`auth.uid()`) gösterir.
* **Reason**: Oturum güvenlik uyarılarının her durumda kullanıcıya ulaştırılabilmesi.
* **Consequences**: Bildirim tetikleyicisi güncellenmiştir.

---

## ADR-009: Tasks.supporters UUID Array Kararının Geçici Kabulü
* **Date**: 2026-07-11
* **Status**: Approved (Temporary Debt)
* **Context**: Bir göreve birden fazla destekçi atanması gerekliliği ve MVP sürümünü yetiştirme baskısı.
* **Decision**: Görev destekçileri `tasks.supporters` kolonu altında `UUID[]` (dizi) olarak saklanmaktadır.
* **Reason**: MVP aşamasında hızlı implementasyon sağlamak ve ara tablo JOIN maliyetlerinden kaçınmak.
* **Consequences**: Destekçilerin göreve katılma tarihi, geçmiş logları veya detaylı RLS kuralları uygulanamamaktadır. İleride `task_assignees` tablosuna taşınması kararlaştırılmıştır.

---

## ADR-010: Legacy Tabloların Flutter Geçişine Kadar Korunması
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Eski veritabanı mimarisinden kalan `access_invitations`, `profiles.role` ve `profiles.university_id` alanlarının tamamen silinmesinin mevcut Flutter uygulamasını bozma riski.
* **Decision**: Bu alanlar veritabanından hemen silinmemiş, **Deprecated** statüsünde bırakılmıştır. `access_invitations` tablosuna yazma yetkileri kapatılmış (read-only), Flutter uygulaması yeni workspace switcher mimarisine geçene kadar geçici olarak korunmaktadır.
* **Reason**: Geriye dönük uyumluluk sağlamak ve Flutter uygulamasının çalışır durumda kalmasını garantilemek.
* **Consequences**: Yeni testlerde bu alanlar da kısmen mock'lanmakta olup, geçiş tamamlandığında silineceklerdir.

---

## ADR-011: Commit ve Push Onay Kuralları
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Yapay zekâ asistanlarının kontrolsüz commit'ler atarak git geçmişini karıştırması veya doğrulanmamış kodları uzak sunucuya push'laması riski.
* **Decision**: Yapay zekâ, kullanıcı açıkça onay vermedikçe git commit yapamaz. Kullanıcı açıkça "push yap" demedikçe git push komutunu çalıştıramaz.
* **Reason**: Kod güvenliği, sürüm kontrol bütünlüğü ve kullanıcı denetimi.
* **Consequences**: Geliştirme adımları küçük parçalar halinde raporlanarak kullanıcı onayı istenir.

---

## ADR-012: AI Continuity ve Feature-First Modular Architecture
* **Date**: 2026-07-11
* **Status**: Approved
* **Context**: Proje büyüdükçe oturumlar arası AI modellerinin bağlam kaybetmesi ve Flutter kodunun sürdürülebilirliğinin zorlaşması.
* **Decision**: Veritabanı ve Flutter kodlarının kesintisiz AI geçişlerini destekleyecek `docs/ai/` hafıza katmanı kurulmuş ve Flutter projesinin **Feature-First** Clean Architecture yapısına refaktör edilmesi planlanmıştır.
* **Reason**: Kod kalitesini artırmak, hataları izole etmek (fault isolation) ve geliştirici hafızasını repo içinde yaşatmak.
* **Consequences**: Bridge adında yeni bir geçiş aşaması planlanmış ve tüm geliştirme bu plana tabi tutulmuştur.

---

## ADR-013: Güvenlik Politikası ve Feature Flag Yalıtımı
* **Date**: 2026-07-12
* **Status**: Approved
* **Context**: İstemci tarafında (Flutter) kullanılan simülasyon ve bypass yeteneklerinin release derlemelerinde güvenlik zafiyeti oluşturma riski.
* **Decision**:
  1. İstemci tarafındaki (client-side) feature flag'ler hiçbir güvenlik politikasını (Authentication, RLS, MFA, cihaz limiti vb.) sessizce atlayamaz veya devre dışı bırakamaz.
  2. Biyometrik veya MFA yeteneği kullanılamıyorsa sistem güvenli fallback olarak **fail-closed** davranmalıdır (admin girişi engellenir veya biyometrik başarısızsa oturum kapatma istenir).
  3. Geliştirici simülasyon araçları ve bypass rotaları derleme aşamasında (`kDebugMode` guard'ları ile) release paketlerinden tamamen elenir (fail-closed).
* **Reason**: Uygulamanın güvenliğini istemci taraflı esneklik bayrakları nedeniyle riske atmamak ve derinlemesine savunma (Defense-in-depth) ilkelerine sadık kalmak.
* **Consequences**: `AuthStateNotifier` simülasyon girişleri ve MFA placeholder geçiş butonları `kDebugMode` ile kilitlenmiş, `DebugSimulationControls` kendi build metodunda release engelleyicisine kavuşturulmuştur.
