# Kampüs Kapında CRM — Sistem Çalışma ve Ekip Davet Mimarisi Dökümü

Bu doküman, **Kampüs Kapında CRM** uygulamasının mimarisini, kullanıcı kayıt/giriş süreçlerini, çoklu ekip (multi-workspace) yapısını ve ekip davet sisteminin çalışma mekanizmasını tüm detaylarıyla açıklamaktadır.

---

## 1. Genel Mimari ve Çoklu Ekip Yapısı (Multi-Tenant Workspace)

Sistem **Multi-Tenant (Çoklu Kiracılı)** mimariye sahiptir. Her veritabanı kaydı (görevler, CRM işletmeleri, raporlar vb.) belirli bir `workspace_id` (ekip/çalışma alanı) ile ilişkilendirilir.

- **Global Profil (`profiles`)**: Bir kullanıcı sisteme kaydolduğunda tek bir global hesabı oluşur.
- **Çoklu Ekip Üyeliği (`workspace_members`)**: Bir kullanıcı sıfırdan birden fazla ekip/workspace kurabilir veya başkalarının kurduğu ekiplere davet edilerek katılabilir.
- **Aktif Ekip Geçişi (`set_current_user_active_workspace`)**: Kullanıcı sol menüden veya üst bardan dilediği çalışma alanını seçerek o ekibin verilerine anında erişebilir.

---

## 2. Kayıt Olma ve Anında Giriş Akışı (Sign Up & Instant Login)

1. **Kullanıcı Kaydı (`signUp`)**:
   - Kullanıcı adı soyadı (`full_name`), e-posta ve şifre girerek kayıt oluşturur.
   - E-posta doğrulama gereksinimi kaldırılmış olup, hesap oluşturulduğu anda Supabase oturumu tetiklenir (`data.session`).
2. **Otomatik Ekip Ataması / Oluşturması**:
   - İlk kez kaydolan kullanıcılara varsayılan bir çalışma alanı atanır veya ilk oturumunda kendi çalışma alanını kurma imkanı sunulur.

---

## 3. Ekip Oluşturma ve Kendi Ekibine Çağırma (Team Creation & Member Invitations)

### A. Kendi Ekibini Kurma
- Sol panellerdeki **"Yeni Ekip / Workspace Kur"** butonuna basılarak yeni bir ekip adı (Örn: *Ankara Kampüs Ekibi*) girilir.
- `create_workspace_with_owner` RPC fonksiyonu çalışır:
  1. Benzersiz bir `slug` oluşturur.
  2. `workspaces` tablosuna ekibi kaydeder.
  3. Oluşturan kullanıcıyı otomatik olarak o ekibin **Owner (Sahibi)** olarak atar.

### B. Başkalarını Kendi Ekibine Çağırma (Davet Gönderme)
- Üst bar veya sol menüdeki **"Ekibe Üye Çağır"** butonuna tıklanır.
- Davet edilecek kişinin e-postası ve yetki rolü seçilir:
  - `staff`: Personel / Ekip Üyesi
  - `representative`: Kampüs Temsilcisi
  - `admin`: Yönetici
- Sistem `workspace_invitations` tablosuna aktif workspace ID'si ile yeni bir davet kaydı (`is_active = true`) ekler.

---

## 4. Başkasının Ekibine Katılma ve Davet Kabul/Reddetme (Joining Other Teams)

1. **Davet Sorgulama (`list_current_user_pending_workspace_invitations`)**:
   - Bir kullanıcı sisteme giriş yaptığında, e-posta adresine gönderilmiş aktif ekip davetleri otomatik sorgulanır.
   - Davet varsa üst barda kırmızı bildirim rozeti gösterilir.
2. **Davet Kabul Etme (`accept_current_user_workspace_invitation`)**:
   - Kullanıcı **"Ekip Davetleri"** modalını açıp **"Kabul Et"** butonuna bastığında atomic veritabanı RPC'si çalışır:
     - Davet edilen kullanıcı ilgili `workspace_members` tablosuna seçilen rol ile eklenir.
     - Davet durumu tamamlandı olarak işaretlenir.
     - Kullanıcının çalışma alanları listesine yeni ekip eklenir ve anında geçiş sağlanır.
3. **Davet Reddetme (`decline_current_user_workspace_invitation`)**:
   - Kullanıcı **"Reddet"** butonuna bastığında davet pasife çekilir.

---

## 5. Yetki Rolleri ve Güvenlik Kuralları (RLS Policies)

| Rol | Yetki Kapsamı |
| :--- | :--- |
| **`owner`** | Ekibin tam yetkili sahibidir. Ekibi silebilir, üyeleri ve yöneticileri yönetebilir. |
| **`admin`** | Ekip yöneticisidir. Yeni üye davet edebilir, görev ve CRM kayıtlarını yönetebilir. |
| **`staff`** | Ekip üyesidir. Görevleri görüntüler, rapor girer ve atandığı işleri tamamlar. |
| **`representative`** | Kampüs temsilcisidir. Sadece kendisine atanan üniversitelerin verilerini görür. |

---

## 6. Veritabanı RPC Fonksiyon Haritası

- `create_workspace_with_owner(p_name, p_slug, p_industry, p_logo_url, p_default_language)`
- `list_current_user_workspaces()`
- `list_current_user_pending_workspace_invitations()`
- `accept_current_user_workspace_invitation(p_invitation_id)`
- `decline_current_user_workspace_invitation(p_invitation_id)`
- `set_current_user_active_workspace(p_target_workspace_id)`
- `leave_current_user_workspace(p_target_workspace_id)`
