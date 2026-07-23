---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kapında Hub — Product Memory

Bu doküman, Kapında Hub platformunun uzun ömürlü ürün mantığını, iş kurallarını ve kavramsal modelini tanımlar.

---

## 1. Ürün Amacı ve SaaS Vizyonu
Kapında Hub, başlangıçta **"Kampüs Kapında"** adındaki üniversite içi teslimat ve operasyon organizasyonu için geliştirilmeye başlanmıştır. Ancak projenin ilerleyen aşamalarında, sistemin diğer benzer saha operasyonu yürüten şirketlere satılabilmesini sağlayacak **Çoklu Kiracılı (Multi-Tenant/Multi-Workspace) bir SaaS platformu** olması kararlaştırılmıştır.

Kullanıcılar sisteme üye olduktan sonra:
* Kendi bağımsız ekiplerini / çalışma alanlarını (workspaces) kurabilirler.
* Başka ekiplerden gelen davetleri kabul ederek birden fazla çalışma alanına üye olabilirler.
* Uygulama içindeki **Workspace Switcher** arayüzü ile aktif olarak çalıştıkları ekip ekranları arasında anlık geçiş yapabilirler.

---

## 2. Workspace Davet Akışı (Workspace Invitations Flow)
Yeni kullanıcıların ve çalışma alanına katılacak ekip üyelerinin süreçleri şu adımlarla yürütülür:
1. **Davet Oluşturma**: Workspace sahipleri veya yöneticileri, e-posta adresi, atanacak yetki rolü (`permission_role`), meslek rolü (`job_role`) ve üniversite yetki kapsamlarını belirterek bir davet oluşturur. Davet e-postası küçük harfe dönüştürülüp kırpılarak (`normalized_email`) saklanır.
2. **Pending Task Assignments**: Kullanıcı sisteme henüz üye olmadan önce e-postasına atanmış görevler varsa, bu atamalar daveti kabul edene kadar veritabanındaki bir bekleme kuyruğunda tutulur.
3. **Davet Kabulü (Acceptance)**: Kullanıcı sisteme giriş yaptıktan sonra e-postasına gönderilen aktif davetleri görüntüler. Daveti onayladığında:
   - `workspace_members` tablosuna üyelik kaydı açılır.
   - Atanan üniversite kapsamları (`workspace_member_university_scopes`) işlenir.
   - Bekleyen görevleri (`pending_task_assignments`) kuyruktan çözülerek doğrudan kullanıcının üzerine (`primary_assignee_id = auth.uid()`) atanır.

---

## 3. Yetkilendirme ve Üyelik Modeli (Role & Permission Model)
Kapında Hub içerisinde yetkiler iki bağımsız kırılımda yönetilir:

### A. Yetki Rolü (Permission Role)
Kullanıcının çalışma alanındaki yönetsel seviyesini belirler:
* **Owner (Çalışma Alanı Sahibi)**: Her çalışma alanının **en az bir** aktif sahibi olmak zorundadır. Sahiplik devredilmeden son aktif Owner çalışma alanını bırakamaz, silinemez veya rolü düşürülemez. Çalışma alanının tüm ayarlarına ve verilerine tam yetkilidir.
* **Admin (Yönetici)**: Owner ile benzer şekilde tüm verilere erişebilir, ancak çalışma alanının sahipliğini değiştiremez ve Owner üyeliklerini silemez.
* **Manager (Yönetici/Müdür)**: Günlük operasyonları, projeleri ve görevleri yönetir. Verileri okuyabilir, ekleyebilir ve güncelleyebilir.
* **Member (Standart Üye)**: Kendisine atanan görevleri ve ilgili operasyonları yönetebilir. Diğer üyeleri yönetme veya hassas şemaları değiştirme yetkisi yoktur.
* **Guest (Ziyaretçi)**: Sadece davet edildiği belirli alanları salt-okunur (read-only) görüntüleyebilir.

### B. Meslek Rolü (Job Role)
Operasyon içindeki uzmanlığı gösterir:
* `operations` (Operasyon)
* `marketing` (Pazarlama)
* `social_media` (Sosyal Medya)
* `video_editor` (Video Editör)
* `software` (Yazılım)
* `university_representative` (Üniversite Temsilcisi)
* `courier_operations` (Kurye Operasyonları)
* `custom` (Özel Tanımlı)

---

## 4. Üniversite Temsilcisi Kapsam Modeli (University Scope Model)
* Standart üyeler ve yöneticiler workspace içindeki tüm üniversitelere erişebilirken, **Üniversite Temsilcisi** (`job_role = 'university_representative'`) rolündeki üyeler strictly filtrelenir.
* Temsilciler, RLS kuralları gereği yalnızca kendilerine atanmış olan `workspace_member_university_scopes` kayıtlarındaki üniversitelerin verilerini (projeler, görevler vb.) görebilir ve yönetebilirler.
* Yönetsel roller (`owner`, `admin`) bu kapsam kısıtlamasından muaftır.

---

## 5. Görev ve Operasyon Modülleri (Tasks & CRM Modules)
* **Görevler (Tasks)**: Workspace bazlı yönetilir. Alt görevler (`subtasks`), kontrol listeleri (`checklists`), yorumlar (`task_comments`) ve tarih değişikliği talepleri gibi alt modüllerle desteklenir.
* **Sözleşmeler (Contracts)**: En hassas verilerdir. RLS kuralları gereği sadece `owner` ve `admin` rollerine açıktır; `manager`, `member` ve temsilciler göremez.
* **Günlük Güncellemeler (Daily Updates)**: Saha ekiplerinin günlük raporlarıdır. Belirli bir teslim saatine (`daily_update_deadline`) bağlıdır ve güncellemeler sürüm takip mantığıyla saklanır.
* **Performans Sistemi**: Üyelerin haftalık, aylık veya yıllık hedeflerini ve telemetri skorlarını ölçer.
* **Takvim Entegrasyonu (Calendar)**: Toplantılar ve takvim etkinlikleri workspace bazlı kiralama izolasyonuna tabidir.

---

## 6. Güvenlik ve Cihaz Sınır Kuralları (Device & Security Rules)
* **Cihaz Limiti**: Her kullanıcının aynı anda aktif olabileceği maksimum cihaz sayısı **2** ile sınırlandırılmıştır. Cihaz ekleme veya çıkarma durumlarında kullanıcı güvenlik bildirimleri alır.
* **MFA (Çok Faktörlü Doğrulama)**: Çalışma alanı ayarlarına göre (`workspace_settings`), yönetici ve sahipler için zorunlu kılınabilir. Koşul sağlandığında single-factor (aal1) oturumlar veritabanı RLS seviyesinde bloke edilir.
* **Sessiz Saatler (Quiet Hours)**: Workspace bazlı bildirim gönderimini kısıtlayan zaman aralıkları tanımlanabilir.
* **30 Günlük Çöp Kutusu (Soft-Delete)**: Neredeyse tüm tablolar `deleted_at` kolonu taşır. Silinen veriler fiziksel olarak yok edilmez, 30 gün boyunca çöp kutusunda bekletilir.
