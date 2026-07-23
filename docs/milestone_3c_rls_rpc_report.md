# Milestone 3C-B Technical Verification Report
## Tenant RLS, Workspace RPCs and Ownership Security

This report details the implementation, database security architecture, and pgTAP verification results for **Milestone 3C-B: Tenant RLS, Workspace RPCs and Ownership Security**.

---

### 1. Milestone Özeti (Milestone Summary)
Milestone 3C-B kapsamında Kapında Hub platformu tekil bir allowlist yapısından çoklu çalışma alanı (multi-workspace/multi-tenant) modeline başarıyla geçirilmiştir. Kullanıcıların global bir hesaba sahip olduğu, kendi ekiplerini kurabildikleri, bekleyen davetler aracılığıyla birden fazla workspace'e üye olabildikleri ve bu workspace'ler arasında güvenli şekilde geçiş yapabildikleri esnek ve güvenli bir veritabanı altyapısı kurulmuştur.

---

### 2. Oluşturulan Migration Dosyaları (Migration Files)
Tüm veritabanı şeması ve yetkilendirme değişiklikleri, sırasıyla uygulanan aşağıdaki 5 migration dosyası aracılığıyla yönetilmiştir:
1. **`20260712020000_multi_workspace_foundation.sql`**: Çalışma alanları (`workspaces`), ayarlar (`workspace_settings`), üyelikler (`workspace_members`), temsilci kapsamları (`workspace_member_university_scopes`), davetler (`workspace_invitations`), davet kapsamları (`workspace_invitation_university_scopes`) ve bekleyen atamalar (`pending_task_assignments`) tablolarının, çoklu kiralama indekslerinin ve eski verilerin göçünün (backfill) yapıldığı temel altyapı migration'ı.
2. **`20260712030000_multi_workspace_rls_and_apis.sql`**: Satır Düzeyinde Güvenlik (RLS) politikalarının güncellenmesi, yardımcı fonksiyonların ve Workspace API RPC metotlarının eklenmesi, audit loglarının workspace ile ilişkilendirilmesi ve Owner bootstrap işlemlerinin tanımlandığı API katmanı migration'ı.
3. **`20260712040000_decouple_signup_from_legacy_allowlist.sql`**: Global hesap açma (signup) adımını eski tekil allowlist (`access_invitations`) engellemesinden ayıran ve her doğrulanan e-posta adresi için varsayılan kısıtlı `'intern'` rolüne sahip profili idempotent şekilde oluşturan fonksiyon güncellemesi migration'ı.
4. **`20260712050000_fix_owner_guard_and_workspace_creation.sql`**: Owner Guard tetikleyicisindeki PostgreSQL aggregate fonksiyonları ile kilit (`FOR UPDATE`) uyumsuzluğu hatasını (`0A000`) çözen ve `create_workspace_with_owner` metodunun custom rol kısıtlamalarına tam uyumunu sağlayan düzeltme migration'ı.
5. **`20260712060000_fix_invitation_task_assignment_resolution.sql`**: Davet kabul etme sırasındaki veritabanı işlem adımlarını sıraya koyan ve atamaların çözümlenmesi esnasında RLS engellemesini aşmak için `enforce_task_update_fields` trigger'ına dar bir güvenlik istisnası ekleyen düzeltme migration'ı.

---

### 3. Workspace Helper Fonksiyonları (Workspace Helper Functions)
Kullanıcının üyelik durumlarını ve rollerini doğrulamak amacıyla `SECURITY DEFINER` ve güvenli `search_path` nitelikleriyle donatılmış şu yardımcı fonksiyonlar yazılmıştır:
* **`is_active_workspace_member(target_workspace_id UUID)`**: Kullanıcının ilgili workspace üzerinde aktif, silinmemiş ve süresi dolmamış bir üye olup olmadığını kontrol eder.
* **`current_workspace_permission_role(target_workspace_id UUID)`**: Kullanıcının workspace içindeki yetki rolünü (`owner`, `admin`, `manager`, `member`, `guest`) döndürür.
* **`current_workspace_job_role(target_workspace_id UUID)`**: Kullanıcının workspace'teki mesleki rolünü (`operations`, `software`, vb.) döndürür.
* **`has_workspace_permission(target_workspace_id UUID, allowed_roles workspace_permission_role[])`**: Kullanıcının yetki seviyesinin izin verilen rollerden biri olup olmadığını test eder.
* **`can_access_workspace_university(target_workspace_id UUID, target_university_id UUID)`**: Üniversite temsilcisi (`university_representative`) dışındaki roller için doğrudan `TRUE` dönerken, temsilciler için sadece scopes tablosunda eşleşen üniversitelere erişim izni tanır.

---

### 4. Workspace RPC’leri (Workspace RPC APIs)
İstemci tarafından çağrılabilen ve iş mantığını yöneten güvenli PostgreSQL fonksiyonları şunlardır:
* **`create_workspace_with_owner(...)`**: Yeni bir workspace oluşturarak, oluşturan kullanıcıyı varsayılan kısıtlar doğrultusunda (`permission_role = 'owner'`, `job_role = 'custom'`, `custom_job_role = 'Workspace Owner'`, `status = 'active'`) çalışma alanının ilk sahibi (Owner) yapar.
* **`list_current_user_workspaces()`**: Kullanıcının aktif üye olduğu tüm çalışma alanlarını ve MFA gereksinimlerini listeler.
* **`list_current_user_pending_workspace_invitations()`**: Kullanıcının e-postasına gönderilen ve henüz kabul edilmemiş bekleyen tüm aktif davetleri gösterir.
* **`accept_current_user_workspace_invitation(p_invitation_id UUID)`**: Daveti kabul ederek üyeliği başlatır, scope atamalarını yapar ve bekleyen görev atamalarını idempotent olarak çözümler.
* **`accept_workspace_invitation_by_token(p_raw_token TEXT)`**: Davet token'ını hash'leyerek (SHA-256) eşleşen daveti otomatik kabul eder.
* **`decline_current_user_workspace_invitation(p_invitation_id UUID)`**: Daveti reddederek durumunu `declined` yapar.
* **`set_current_user_active_workspace(p_target_workspace_id UUID)`**: Kullanıcının global profilindeki `last_active_workspace_id` alanını günceller.
* **`transfer_workspace_ownership(p_target_workspace_id UUID, p_target_member_id UUID)`**: Workspace sahipliğini başka bir aktif üyeye devreder (caller `admin` rolüne düşürülür, target `owner` yapılır).
* **`leave_current_user_workspace(p_target_workspace_id UUID)`**: Kullanıcının ilgili workspace üyeliğinden çıkmasını sağlar.
* **`current_user_workspace_mfa_requirement(p_workspace_id UUID)`**: Kullanıcının workspace içindeki rolünün MFA (Çok Faktörlü Kimlik Doğrulama) gerektirip gerektirmediğini döner.

---

### 5. Tenant RLS Kapsamı (Tenant RLS Scope)
Tüm kiralanabilir tablolar (`universities`, `projects`, `tasks`, `subtasks`, `checklists`, `task_comments`, `task_join_requests`, `task_date_change_requests`, `businesses`, `contracts`, `daily_updates`, `meetings`, `meeting_attendees`, `notifications`, `performance_scores`, `performance_metrics`, `audit_logs`) Satır Düzeyinde Güvenlik (RLS) politikalarıyla korunmaktadır. Kullanıcıların veritabanı seviyesinde sadece üye oldukları çalışma alanlarına ait satırları görmesi ve yönetmesi garanti altına alınmıştır.

---

### 6. Üniversite Temsilcisi Scope Modeli (University Representative Scope Model)
Üniversite temsilcisi (`job_role = 'university_representative'`) rolüne sahip üyeler, workspace içindeki tüm verilere erişemezler. Temsilcilerin görme ve işlem yetkileri, kendilerine atanan `workspace_member_university_scopes` kayıtlarındaki üniversiteler ile sınırlandırılmıştır. Owner, admin ve manager rolleri bu scope filtrelemesinden muaftır.

---

### 7. Contracts Erişim Güvenliği (Contracts Security)
Sözleşmeler (`contracts`) tablosu, gizli finansal ve hukuki bilgiler içerdiğinden en üst düzey RLS kısıtlarına tabidir. Standart üyeler ve üniversite temsilcileri (Manager ve altı) RLS politikaları gereği hiçbir contract kaydına erişemez. Sözleşmeleri okuma ve yazma yetkisi yalnızca `owner` ve `admin` rollerine tanınmıştır.

---

### 8. Global ve Workspace Notification Modeli (Global & Workspace Notifications)
Bildirimler (`notifications`) modeli çoklu kiralama yapısına uyum sağlayacak şekilde güncellenmiştir:
* **Global Bildirimler**: Henüz bir workspace'e katılmamış kullanıcılara ait cihaz girişleri, güvenlik uyarıları gibi bildirimler `notification_scope = 'global'` olarak tutulur ve `workspace_id` alanı boştur (NULL).
* **Workspace Bildirimleri**: `notification_scope = 'workspace'` olarak etiketlenir ve doğrudan ilgili çalışma alanının ID'si ile ilişkilendirilerek RLS altında sadece o çalışma alanındaki aktif üyelere gösterilir.

---

### 9. Owner Guard ve Ownership Transfer Modeli (Owner Guard & Ownership Transfer)
* **Owner Guard**: Workspace'in sahipsiz kalmasını önlemek amacıyla `workspace_members` tablosuna `tr_workspace_members_owner_guard` tetikleyicisi bağlanmıştır. Bir workspace'teki son aktif Owner'ın silinmesi, rolünün düşürülmesi, üyeliğinin askıya alınması veya erişim süresinin kısıtlanması veritabanı seviyesinde kesinlikle engellenir.
* **Concurrency Locking**: Son owner kontrolleri yapılmadan önce ilgili `workspaces` satırı `FOR UPDATE` ile kilitlenerek eşzamanlı (race condition) işlemler sıraya sokulur.
* **Ownership Transfer**: Sahiplik devri `transfer_workspace_ownership` RPC'si üzerinden güvenli bir işlem (transaction) içinde gerçekleştirilir.

---

### 10. Signup’ın Legacy Allowlist’ten Ayrılması (Signup Decoupling)
Global Kapında Hub hesabı oluşturulurken (sign up) tetiklenen `handle_new_user` tetikleyici fonksiyonu eski tekil `access_invitations` tablosundaki allowlist zorunluluğundan arındırılmıştır. Artık herkes global bir hesap oluşturabilir. Yeni kayıt olan kullanıcılara herhangi bir workspace yetkisi veya üyelik verilmez; profiles tablosundaki legacy role kolonuna kısıtlı `'intern'` varsayılan değeri atanır.

---

### 11. Kampüs Kapında Owner Bootstrap Durumu (Bootstrap Owner)
Veritabanı kurulduğunda, platform sahibi `resultankilic.business@gmail.com` adresi için otomatik olarak varsayılan kiralama alanı `'df39e73b-bf72-4d1a-9694-82bd8996b797'` üzerinde aktif bir Owner üyeliği atanır. Kullanıcı henüz kayıt olmamışsa, sisteme ilk girdiğinde bu sahipliği doğrudan devralabilmesi için süresi 1 yıl olan bir pending owner daveti `workspace_invitations` tablosuna otomatik yazılır.

---

### 12. Legacy `access_invitations` Durumu (Legacy Allowlist)
Eski `access_invitations` allowlist tablosu geriye dönük kod uyumluluğunu korumak adına veritabanında tutulmakla birlikte, yetkisiz veri eklemelerini veya değişiklikleri önlemek için authenticated, anon ve public rolleri için veritabanı düzeyinde yazma hakları (INSERT, UPDATE, DELETE) tamamen kapatılmıştır (Read-only / Deprecated).

---

### 13. Pending Task Assignment Çözümleme Akışı (Pending Task Assignment Resolution)
Daveti kabul etme (`accept_current_user_workspace_invitation`) akışı, RLS tetikleyici kısıtlarının sırasıyla çalışması için şu sırayla yürütülür:
1. Davet doğrulanır ve kilitlenir.
2. Üye kaydı `workspace_members` tablosuna eklenir (idempotent olarak).
3. Üniversite kapsamları atanır.
4. Davet accepted durumuna getirilir.
5. Görev atama kuyruğundaki (`pending_task_assignments`) kayıtlar idempotent şekilde çözümlendi olarak güncellenir (`resolved_user_id = auth.uid()`, `resolved_at = now()`).
6. En son adımda, `enforce_task_update_fields` tetikleyicisine eklenen **dar istisna** sayesinde, üyenin ataması bekleyen görevleri (diğer yönetim alanlarını değiştirmeksizin) kendi üzerine atamasına (`primary_assignee_id = auth.uid()`) izin verilir.

---

### 14. Test Dosyaları (Test Files)
Veritabanı üzerinde 4 adet pgTAP test dosyası bulunmaktadır:
1. `20260710150000_test_verification.sql` (Legacy RLS & Soft-delete testleri)
2. `20260711110000_test_milestone3.sql` (Eski auth, allowlist ve cihaz limit testleri)
3. `20260711_test_milestone3c_workspace_foundation.sql` (Çoklu kiralama temel şema ve kısıt testleri)
4. `20260712_test_milestone3c_rls_and_apis.sql` (Çoklu kiralama RLS, API RPC metotları ve Owner kısıt testleri)

---

### 15. Test Düzeltmeleri (Test Fixes)
Mevcut testlerin multi-workspace mimarisine uyum sağlaması için yapılan düzeltmeler:
* `20260710150000_test_verification.sql`: Test kullanıcıları için eksik olan `workspace_members` ve `workspace_member_university_scopes` mock fixture kayıtları eklenerek RLS sorgularının boş dönmesi engellenmiş ve RLS testleri başarıyla geçirilmiştir.
* `20260711110000_test_milestone3.sql`: Signup adımında yeni kullanıcının varsayılan kısıtlı `'intern'` rolü alması ve otomatik olarak çalışma alanlarına üye yapılmaması doğrulama beklentisine eklenmiştir.
* `20260711_test_milestone3c_workspace_foundation.sql`: Davet sayısı testi, bootstrap davetiyle çakışmaması için `invite1@test.com` filtresiyle özelleştirilmiştir.
* `20260712_test_milestone3c_rls_and_apis.sql`: Planlanan test sayısı gerçek test sayısıyla (25) eşitlenmiş ve `auth.jwt()` metot taklitleri standart JSON claims biçimine çevrilmiştir.

---

### 16. Doğrulama Sonuçları (Verification Results)
* `npx supabase db reset`: **PASS**
* `npx supabase db lint --local --level warning --fail-on warning`: **PASS** (Hata: 0, Uyarı: 0)
* `npx supabase test db`: **PASS** (Toplam: 60, Başarılı: 60, Başarısız: 0)
* `npx supabase db diff --local`: **PASS** (Schema diff: Boş, Beklenmeyen fark: Yok)

---

### 17. Kalan Teknik Borçlar (Technical Debts)
* **Destekçiler (Supporters) İlişkisi**: `tasks.supporters` kolonu şu anda UUID dizisi (`UUID[]`) olarak tutulmaktadır. MVP sonrasında supporter rolünün başlama tarihi, geçmişi, rolleri ve detaylı denetim logları için `task_assignees` adında ayrı bir ara ilişki tablosuna taşınması önerilmektedir.
* **TOTP/MFA Kaydı**: Gerçek Çok Faktörlü Kimlik Doğrulama kayıt ve doğrulama akışları mobil uygulamaya entegre edilmemiştir (RPC düzeyinde hazır durumdadır).
* **E-posta Gönderimi**: Davet maillerinin arka planda otomatik gönderim entegrasyonu (SMTP/Supabase Auth trigger) henüz kurulmamıştır.
* **Mobil Entegrasyon**: Mobil taraftaki onboarding, davetleri kontrol etme, yeni workspace kurma ve workspace switcher arayüz entegrasyonları henüz yapılmamıştır (Milestone 3C-C aşaması).
* **Legacy Alanlar**: Geriye dönük uyumluluk için profiles tablosunda tutulan `role` ve `university_id` kolonları henüz veritabanından tamamen temizlenmemiştir.
* **Eski RPC**: `check_current_user_access` metodu geçiş süreci tamamlanana kadar korunmaktadır.
* ** access_invitations**: Eski allowlist tablosu read-only modda saklanmaktadır.
* **Production Deployment**: Supabase bulut ortamına deployment henüz gerçekleştirilmemiştir.

---

### 18. Milestone 3C-C’ye Geçiş Durumu (Transition Status)
Veritabanı güvenliği, çoklu kiralama RLS politikaları, sahiplik koruma mekanizmaları ve API metotları veritabanı seviyesinde eksiksiz olarak tamamlanmış ve doğrulanmıştır. **Milestone 3C-C (Flutter onboarding, pending invitations, workspace creation and workspace switcher) aşamasına geçilmesi için hiçbir engel bulunmamaktadır.**
