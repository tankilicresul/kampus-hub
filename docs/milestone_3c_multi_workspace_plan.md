# Milestone 3C: Multi-Tenant Workspace Migration Plan

> [!NOTE]
> **Current Status**: 
> - **Phase 3C-A (Multi-Workspace Foundation and Safe Backfill)**: Completed successfully.
> - **Phase 3C-B (Tenant RLS, Workspace RPCs and Ownership Security)**: Completed successfully. All 60 pgTAP database test assertions PASS.
> - **Phase 3C-C (Flutter integration & switcher UI)**: Next phase (Pending).

---

Bu doküman, Kampüs Hub uygulamasını tek kiracılı (single-tenant) global allowlist yapısından, kullanıcıların kendi ekiplerini/workspace'lerini oluşturabildiği, birden fazla ekibe katılabildiği ve aralarında geçiş yapabildiği çoklu kiracılı (multi-tenant) bir yapıya dönüştürme planını içerir.

---

## 1. Mevcut Single-Tenant Yapı Analizi

Uygulamanın mevcut yapısında:
- Giriş kontrolü global bir `access_invitations` tablosu (allowlist) üzerinden yapılır. Daveti/izin kaydı olmayan kullanıcıların uygulamaya girişi tetikleyicilerle engellenir.
- Her kullanıcının global `profiles.role` kolonu altında tek bir yetki rolü (admin, operations, representative vb.) bulunur.
- Veri tabanındaki tüm ana modüller (`universities`, `projects`, `businesses`, `tasks`) global seviyededir. Satır bazlı güvenlik (RLS) kuralları yalnızca global kullanıcı rollerini baz alarak filtreleme yapar. Multi-tenant izolasyonu yoktur.

---

## 2. Table Scope Matrix (Tablo Kapsam Matrisi)

Veri tabanındaki mevcut ve yeni planlanan tabloların çoklu kiracı (multi-tenant) yapısındaki durumları aşağıda kategorize edilmiştir:

| Tablo Adı | Kategori | Gerekçe / RLS Uygulama Yöntemi |
| :--- | :--- | :--- |
| **`profiles`** | Global | Kullanıcının ana kimlik (identity) bilgisidir. Workspace'lerden bağımsızdır. |
| **`user_devices`** | Global | Kullanıcı başına global maksimum 2 cihaz sınırını korumak için tekil (global) kalmalıdır. |
| **`calendar_accounts`** | Global | Kullanıcının harici takvim entegrasyonu kimlik bilgileridir; global düzeyde saklanır. |
| **`workspaces`** | Global / Root | Kiracı (tenant) yapısının kendisidir. |
| **`workspace_members`** | Doğrudan `workspace_id` taşımalı | Kullanıcı ile workspace eşleştirmesidir. |
| **`workspace_member_university_scopes`**| Doğrudan `workspace_id` taşımalı | Üyenin üniversite kapsam eşleştirmesidir. |
| **`workspace_invitations`** | Doğrudan `workspace_id` taşımalı | Belirli bir workspace'e yeni üye davetidir. |
| **`workspace_settings`** | Doğrudan `workspace_id` taşımalı | Workspace düzeyinde MFA, dil vb. konfigürasyonlar. |
| **`universities`** | Doğrudan `workspace_id` taşımalı | Workspace bünyesindeki yerel kampüsler. |
| **`projects`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı iş projeleri. |
| **`tasks`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı görevler. RLS sorgularının hızlı çalışması için doğrudan `workspace_id` taşır. |
| **`businesses`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı CRM işletmeleri. |
| **`daily_updates`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı günlük rapor güncellemeleri. |
| **`meetings`** | Doğrudan `workspace_id` taşımalı | Workspace içi takvim toplantıları. |
| **`notifications`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı kullanıcı içi bildirimler. |
| **`performance_scores`** | Doğrudan `workspace_id` taşımalı | Workspace bazlı performans değerlendirme skorları. |
| **`performance_metrics`** | Doğrudan `workspace_id` taşımalı | Workspace içi performans telemetrileri. |
| **`audit_logs`** | Global / Nullable `workspace_id` | Sistem geneli log havuzudur; opsiyonel olarak ilgili workspace_id'yi taşır. |
| **`task_assignees`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`task_checklist_items`** | Üst kayıt üzerinden erişimli | `subtasks` veya `tasks` üzerinden parent JOIN ile yetki alır. |
| **`task_comments`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`task_attachments`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`task_status_history`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`task_change_requests`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`task_join_requests`** | Üst kayıt üzerinden erişimli | `tasks` tablosuna bağlıdır. RLS: `tasks.workspace_id` üzerinden yetki alır. |
| **`pending_task_assignments`**| Üst kayıt üzerinden erişimli | `workspace_invitations` tablosuna bağlıdır. RLS: `invitation.workspace_id` tabanlıdır. |
| **`business_contacts`** | Üst kayıt üzerinden erişimli | `businesses` tablosuna bağlıdır. RLS: `businesses.workspace_id` tabanlıdır. |
| **`business_activities`** | Üst kayıt üzerinden erişimli | `businesses` tablosuna bağlıdır. RLS: `businesses.workspace_id` tabanlıdır. |
| **`contracts`** | Üst kayıt üzerinden erişimli | `businesses` tablosuna bağlıdır. RLS: `businesses.workspace_id` tabanlıdır. |
| **`daily_update_versions`** | Üst kayıt üzerinden erişimli | `daily_updates` tablosuna bağlıdır. RLS: `daily_updates.workspace_id` tabanlıdır. |
| **`access_invitations`** | Deprecated / Kaldırılacak | Eski single-tenant allowlist yapısıdır. İlk aşamada read-only olarak korunup sonradan kaldırılacaktır. |
| **`project_templates`** | MVP Sonrasına Ertelendi | Proje şablonlama yapısı sonraki fazlarda eklenecektir. |
| **`marketing_contents`** | MVP Sonrasına Ertelendi | Pazarlama içerikleri ve yönetimi MVP sonrası tasarlanacaktır. |
| **`marketing_metrics`** | MVP Sonrasına Ertelendi | Pazarlama analitiği MVP sonrası entegre edilecektir. |
| **`decisions`** | MVP Sonrasına Ertelendi | Karar alma ve onay mekanizmaları MVP sonrasına ertelenmiştir. |
| **`calendar_events_cache`** | MVP Sonrasına Ertelendi | Harici takvim cache yapısı sonraki fazlarda planlanacaktır. |
| **`availability_preferences`**| MVP Sonrasına Ertelendi | Takım müsaitlik tercihleri MVP sonrasına bırakılmıştır. |
| **`uploaded_schedules`** | MVP Sonrasına Ertelendi | Ders/mesai çizelgeleri yükleme yapısı MVP sonrasına ertelenmiştir. |

### Parent-Child RLS Uygulama Yöntemi
`workspace_id` taşımayan alt tablolarda (Örn: `task_comments`), RLS politikaları üst kayıt (parent) üzerinden JOIN yapılarak denetlenir. 
```sql
CREATE POLICY "task_comments_workspace_isolation" ON public.task_comments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id
              AND public.is_workspace_member(t.workspace_id, auth.uid())
        )
    );
```
Bu sayede veritabanı şeması normalize kalır, gereksiz kolon tekrarlarından kaçınılır ve güvenlik doğrudan üst kayda bağlı olarak sürdürülür.

---

## 3. Multi-University Scope Model (Çoklu Üniversite Kapsamı)

Kullanıcıların tek bir üniversite yerine birden fazla üniversite yetki kapsamına atanabilmesi için many-to-many ilişki şeması kullanılacaktır.

```sql
CREATE TABLE public.workspace_member_university_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE (workspace_member_id, university_id)
);
```

### Kapsam ve Yetki Filtreleme Kuralları
- **Bypass Kuralları**: `owner` veya `admin` yetkisine sahip olan workspace üyeleri üniversite filtrelerine tabi tutulmaz, workspace altındaki tüm üniversitelere tam yetkili erişim sağlar.
- **Temsilci Filtreleme**: `university_representative` rolüne sahip üyeler, RLS politikalarında yalnızca `workspace_member_university_scopes` tablosunda kendilerine atanmış olan `university_id` kayıtlarını görebilir ve yönetebilirler.
- **RLS Örneği (`universities` tablosu için)**:
```sql
CREATE POLICY "University visibility based on member scopes" ON public.universities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.user_id = auth.uid()
              AND wm.workspace_id = universities.workspace_id
              AND wm.is_active = true
              AND (
                  wm.permission_role IN ('owner', 'admin') -- Owner/Admin her şeyi görür
                  OR EXISTS (
                      SELECT 1 FROM public.workspace_member_university_scopes wmus
                      WHERE wmus.workspace_member_id = wm.id
                        AND wmus.university_id = universities.id
                  )
              )
          )
    );
```

---

## 4. Invitation Acceptance Transaction (Güvenli Davet Kabulü)

Davet kabulü, tek bir veritabanı işlemi (atomic transaction) olarak tasarlanmış olan `accept_current_user_workspace_invitation` RPC fonksiyonu üzerinden gerçekleştirilecektir.

### RPC İmzası ve Mantıksal Akışı
```sql
CREATE OR REPLACE FUNCTION public.accept_current_user_workspace_invitation(
    p_invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
    v_email TEXT;
    v_token_hash TEXT;
    v_invitation RECORD;
    v_member_id UUID;
    v_assignment RECORD;
BEGIN
    -- 1. Giriş yapan kullanıcının e-postasını JWT context'inden güvenli al
    v_email := trim(lower(auth.jwt() ->> 'email'));
    IF v_email IS NULL OR v_email = '' THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı: E-posta bulunamadı.';
    END IF;

    -- 2. Token hash'ini hesapla (SHA-256)
    v_token_hash := encode(digest(p_invitation_token, 'sha256'), 'hex');

    -- 3. Daveti bul ve kilitle (Pessimistic Locking ile eşzamanlı kabulleri önle)
    SELECT * INTO v_invitation 
    FROM public.workspace_invitations 
    WHERE token_hash = v_token_hash 
      AND trim(lower(email)) = v_email
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_INVITATION');
    END IF;

    -- 4. Workspace Member kaydını idempotent şekilde oluştur
    INSERT INTO public.workspace_members (
        workspace_id, 
        user_id, 
        permission_role, 
        job_role, 
        department
    )
    VALUES (
        v_invitation.workspace_id,
        auth.uid(),
        v_invitation.permission_role,
        v_invitation.job_role,
        v_invitation.department
    )
    ON CONFLICT (workspace_id, user_id) 
    DO UPDATE SET 
        permission_role = EXCLUDED.permission_role,
        job_role = EXCLUDED.job_role,
        is_active = true
    RETURNING id INTO v_member_id;

    -- 5. Üniversite kapsamlarını workspace_member_university_scopes tablosuna ekle
    IF v_invitation.university_scope_id IS NOT NULL THEN
        INSERT INTO public.workspace_member_university_scopes (workspace_member_id, university_id, created_by)
        VALUES (v_member_id, v_invitation.university_scope_id, auth.uid())
        ON CONFLICT (workspace_member_id, university_id) DO NOTHING;
    END IF;

    -- 6. Bekleyen görevleri (pending_task_assignments) kullanıcıya aktar (idempotent)
    FOR v_assignment IN 
        SELECT * FROM public.pending_task_assignments 
        WHERE invitation_id = v_invitation.id
    LOOP
        IF v_assignment.assignment_type = 'primary_assignee' THEN
            UPDATE public.tasks 
            SET primary_assignee_id = auth.uid() 
            WHERE id = v_assignment.task_id;
        ELSIF v_assignment.assignment_type = 'supporter' THEN
            UPDATE public.tasks 
            SET supporters = array_append(supporters, auth.uid()) 
            WHERE id = v_assignment.task_id 
              AND NOT (auth.uid() = ANY(supporters));
        END IF;
    END LOOP;

    -- 7. Bekleyen görev atamaları geçici tablosundan temizle
    DELETE FROM public.pending_task_assignments WHERE invitation_id = v_invitation.id;

    -- 8. Daveti geçersiz kıl
    UPDATE public.workspace_invitations
    SET accepted_at = now(),
        is_active = false
    WHERE id = v_invitation.id;

    -- 9. Workspace içi hoş geldin bildirimi oluştur
    INSERT INTO public.notifications (user_id, workspace_id, title, body)
    VALUES (
        auth.uid(), 
        v_invitation.workspace_id,
        'Workspace''e katıldınız',
        'Başarıyla ekibe katıldınız.'
    );

    -- 10. Aktif workspace önerisi olarak dön
    RETURN json_build_object(
        'success', true, 
        'workspace_id', v_invitation.workspace_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 5. Workspace Creation Transaction (Workspace Oluşturma)

Kullanıcıların sıfırdan ekip/workspace kurmasını sağlayan atomic `create_workspace_with_owner` RPC fonksiyonu:

```sql
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
    p_name TEXT,
    p_slug TEXT,
    p_industry TEXT,
    p_logo_url TEXT,
    p_default_language TEXT,
    p_timezone TEXT
)
RETURNS JSON AS $$
DECLARE
    v_workspace_id UUID;
    v_slug TEXT;
BEGIN
    -- 1. Slug formatını normalize et ve benzersizliğini kontrol et
    v_slug := lower(trim(p_slug));
    IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) THEN
        RETURN json_build_object('success', false, 'error', 'SLUG_ALREADY_EXISTS');
    END IF;

    -- 2. Workspace oluştur
    INSERT INTO public.workspaces (
        name, 
        slug, 
        industry, 
        logo_url, 
        default_language, 
        timezone
    )
    VALUES (
        p_name,
        v_slug,
        p_industry,
        p_logo_url,
        p_default_language,
        p_timezone
    )
    RETURNING id INTO v_workspace_id;

    -- 3. Oluşturan kullanıcıyı otomatik Owner olarak ata (Tetikleyici olmadan doğrudan RPC içinde güvenli)
    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        permission_role,
        job_role
    )
    VALUES (
        v_workspace_id,
        auth.uid(),
        'owner'::public.workspace_permission_role,
        'custom'::public.workspace_job_role
    );

    -- 4. Varsayılan Workspace ayarlarını oluştur
    INSERT INTO public.workspace_settings (workspace_id, mfa_required_roles)
    VALUES (v_workspace_id, ARRAY['owner'::public.workspace_permission_role, 'admin'::public.workspace_permission_role]);

    -- 5. Audit Log kaydı ekle
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
    VALUES (
        auth.uid(),
        'CREATE',
        'workspaces',
        v_workspace_id,
        json_build_object('name', p_name, 'slug', v_slug, 'role', 'owner')
    );

    RETURN json_build_object('success', true, 'workspace_id', v_workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 6. Ownership Transfer Model (Owner Sorumluluk ve Güvenliği)

Workspace üzerindeki en yetkili rol olan `owner` rolünün güvenliği ve devredilmesi için alınacak önlemler:

### Son Owner Koruma Kuralları
- **Rol Değişikliği / Üyelikten Ayrılma Engeli**: Bir workspace'in son aktif `owner` kullanıcısı üyeliğini pasifleştiremez, rolünü düşüremez ve üyeliği silinemez.
- **Eşzamanlı İstek Güvenliği (Concurrency)**: Eşzamanlı iki işlemde de son owner'ın kaldırılmaya çalışılmasını önlemek için transaction'lar `SERIALIZABLE` düzeyinde izole edilecek ve tetikleyici düzeyinde tablo satırları kilitlenecektir (`SELECT FOR UPDATE`).
- **Owner Koruma Tetikleyicisi**:
```sql
CREATE OR REPLACE FUNCTION public.enforce_owner_constraints()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_count INT;
BEGIN
    -- İşlem yapılan üyeliğin eski durumunun owner olup olmadığını kontrol et
    IF OLD.permission_role = 'owner' THEN
        -- Eğer güncellenen rol owner dışı bir rol ise veya silme işlemi yapılıyorsa
        IF (TG_OP = 'UPDATE' AND NEW.permission_role <> 'owner') OR (TG_OP = 'DELETE') THEN
            -- Eşzamanlı işlemleri durdurmak için satırları kilitleyerek aktif owner sayısını doğrula
            SELECT count(*) INTO v_owner_count 
            FROM public.workspace_members 
            WHERE workspace_id = OLD.workspace_id AND permission_role = 'owner' AND is_active = true
            FOR UPDATE;
            
            IF v_owner_count <= 1 THEN
                RAISE EXCEPTION 'Erişim reddedildi: Workspace üzerinde en az bir adet aktif Owner kalmalıdır. Devir işlemlerini transfer RPC fonksiyonu üzerinden gerçekleştirin.';
            END IF;
        END IF;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_workspace_members_owner_guard
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_constraints();
```

### Devir RPC'si (`transfer_workspace_ownership`)
```sql
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
    p_target_member_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_caller_member RECORD;
    v_target_member RECORD;
BEGIN
    -- 1. Çağrı yapan kullanıcının bu workspace'in sahibi (owner) olup olmadığını doğrula
    SELECT * INTO v_caller_member 
    FROM public.workspace_members 
    WHERE user_id = auth.uid() 
      AND permission_role = 'owner' 
      AND is_active = true
      FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED_NOT_WORKSPACE_OWNER');
    END IF;

    -- 2. Hedef üyenin varlığını, aktifliğini ve aynı workspace içinde olduğunu doğrula
    SELECT * INTO v_target_member 
    FROM public.workspace_members 
    WHERE id = p_target_member_id 
      AND workspace_id = v_caller_member.workspace_id
      AND is_active = true
      FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'TARGET_MEMBER_NOT_FOUND_OR_INACTIVE');
    END IF;

    -- 3. Hedef üyeyi 'owner' yap
    UPDATE public.workspace_members
    SET permission_role = 'owner'::public.workspace_permission_role
    WHERE id = v_target_member.id;

    -- 4. Eski sahibin rolünü 'admin' olarak güncelle
    UPDATE public.workspace_members
    SET permission_role = 'admin'::public.workspace_permission_role
    WHERE id = v_caller_member.id;

    -- 5. Audit Log yaz
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
    VALUES (
        auth.uid(),
        'OWNER_TRANSFER',
        'workspace_members',
        v_target_member.id,
        json_build_object('workspace_id', v_caller_member.workspace_id, 'from_user', auth.uid(), 'to_member_id', p_target_member_id)
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 7. Constraint and Index Plan (Kısıt ve İndeks Planı)

Sorgu performansını artırmak ve verilerin bütünlüğünü korumak amacıyla aşağıdaki kısıtlamalar ve indeksler veri tabanında tanımlanacaktır:

- **Constraint**: `workspaces.slug` benzersiz olmalıdır (`UNIQUE(slug)`).
- **Constraint**: `workspace_members` için aynı workspace'e aynı kullanıcı iki kez eklenemez (`UNIQUE(workspace_id, user_id)`).
- **Constraint**: Aynı davet e-postası ve workspace için yalnızca tek bir aktif davet bulunabilir. Bunu filtrelemek amacıyla kısmi (partial) indeks kullanılacaktır:
  ```sql
  CREATE UNIQUE INDEX idx_unique_active_invitation_per_workspace
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE is_active = true;
  ```
- **Constraint**: `workspace_member_university_scopes` tablosunda üye ve üniversite ikilisi tekil olmalıdır (`UNIQUE(workspace_member_id, university_id)`).
- **Constraint**: `workspace_invitations.token_hash` benzersiz olmalıdır (`UNIQUE(token_hash)`).
- **Index (Case-Insensitive Invitation Email)**:
  ```sql
  CREATE INDEX idx_invitations_normalized_email ON public.workspace_invitations (lower(email));
  ```
- **Index (Workspace Performance and Soft Deletes)**:
  ```sql
  CREATE INDEX idx_tasks_workspace_status ON public.tasks (workspace_id, status);
  CREATE INDEX idx_tasks_workspace_deleted ON public.tasks (workspace_id, deleted_at) WHERE deleted_at IS NULL;
  ```

---

## 8. Active Workspace Persistence (Aktif Workspace Yönetimi)

Kullanıcının o an çalıştığı aktif çalışma alanı bilgisinin yönetimi ve güvenliği:

1. **İstemci Tarafı (Local Secure Storage)**: Aktif seçili workspace UUID'si cihaz üzerinde şifreli olarak (`SecureStorage` veya `SharedPreferences`) saklanır.
2. **Sunucu Tarafı (Database State)**: `profiles` tablosuna `last_active_workspace_id UUID REFERENCES workspaces(id)` kolonu eklenecektir. Kullanıcı her workspace değiştirdiğinde sunucuda bu kolon güncellenecektir.
3. **Üyelik Doğrulama (Server-Side Validation)**: İstemciden gelen veriler RLS kuralları ile kontrol edilirken sunucu, kullanıcının o workspace üzerindeki üyeliğinin hâlâ aktif (`is_active = true` ve süresi dolmamış) olduğunu dinamik doğrular.
4. **Pasifleşme Durumunda Fallback**: Eğer kullanıcının aktif çalıştığı workspace üyeliği pasifleştirilir veya sonlandırılırsa, sistem ilk açılışta veritabanından kullanıcının üye olduğu diğer aktif ilk workspace'i bularak otomatik yönlendirme yapar. Hiç aktif üyeliği kalmamışsa kullanıcıyı onboarding arayüzüne atar.

---

## 9. Workspace-Level MFA Policy (MFA Kapsamı)

Güvenlik politikası, kullanıcının global kimliği yerine o an erişmeye çalıştığı workspace üzerindeki yetki seviyesine (permission role) bağlanacaktır:

- **MFA Zorunluluk Kuralları**:
  - `owner`: Zorunlu (MFA doğrulaması olmadan workspace dashboard yüklenmez).
  - `admin`: Zorunlu.
  - `manager`: Workspace ayarlarındaki `workspace_settings.mfa_required_roles` dizisinde tanımlıysa zorunlu.
  - `member` / `guest`: İsteğe bağlı.

### RLS / API Seviyesinde Engelleme
Eğer bir kullanıcının erişmeye çalıştığı workspace üzerinde MFA zorunluluğu varsa fakat kullanıcının mevcut auth session'ı MFA doğrulaması içermiyorsa, o workspace verileri RLS seviyesinde engellenecektir.
```sql
-- MFA Seviyesini denetleyen RLS fonksiyonu:
CREATE OR REPLACE FUNCTION public.is_mfa_satisfied(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.workspace_permission_role;
    v_mfa_required BOOLEAN;
BEGIN
    -- Kullanıcının rolünü al
    SELECT permission_role INTO v_role 
    FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND is_active = true;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Workspace'in MFA ayarını denetle
    SELECT (v_role = ANY(mfa_required_roles)) INTO v_mfa_required
    FROM public.workspace_settings
    WHERE workspace_id = p_workspace_id;

    -- Eğer rol için MFA gerekliyse auth session'ın aal2 (Multi-factor) düzeyinde olduğunu kontrol et
    IF COALESCE(v_mfa_required, false) THEN
        RETURN (auth.jwt() ->> 'aal') = 'aal2';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 10. Eski Allowlist Geçişi ve Migration Rollback Stratejisi

Mevcut global `access_invitations` tablosunun güvenli biçimde kullanımdan kaldırılması ve olası hatalarda veri kaybı yaşanmadan geri dönülmesi planı:

### Geçiş Sırası
1. **Şema Kurulumu**: Yeni `workspaces`, `workspace_members`, `workspace_invitations`, `workspace_member_university_scopes` ve `pending_task_assignments` tablolarını oluşturun.
2. **Default Workspace**: Varsayılan "Kampüs Kapında" workspace kaydını oluşturun.
3. **Davetleri Taşıma (Migration)**:
   ```sql
   INSERT INTO public.workspace_invitations (workspace_id, email, permission_role, is_active, expires_at, accepted_at)
   SELECT 
       'df39e73b-bf72-4d1a-9694-82bd8996b797', 
       email, 
       CASE WHEN role = 'admin' THEN 'admin'::public.workspace_permission_role ELSE 'member'::public.workspace_permission_role END,
       is_active, 
       expires_at, 
       accepted_at
   FROM public.access_invitations;
   ```
4. **Üyeleri Taşıma (Migration)**:
   Mevcut profilleri, default workspace altına taşıyarak `workspace_members` kayıtlarını oluşturun.
5. **Backfill**: Tüm üniversite, proje, CRM ve görev verilerini `workspace_id = 'df39e73b-bf72-4d1a-9694-82bd8996b797'` değeriyle güncelleyin.
6. **Güvenlik Testleri**: RLS izolasyonlarını ve yeni RPC fonksiyonlarını yerel test suitinde doğrulayın.
7. **Allowlist Deprecation**: Eski `access_invitations` tablosundaki tüm `INSERT/UPDATE/DELETE` izinlerini kapatıp, sadece okuma yetkisi olan read-only bir deprecated statüsüne çekin.
8. **Silme Planı**: Bir sonraki kararlı canlı yayından (production release) 2 hafta sonra tablonun silinmesini planlayın.

### Rollback Stratejisi
Migration başarısız olursa veya entegrasyon testlerinde hata çıkarsa canlı sistemi eski haline getirmek için:
1. `profiles` tablosuna `role` ve `university_id` kolonları (geçici olarak silinmemişse veya yedekten) geri yüklenir.
2. Tüm yeni tablolar ve fonksiyonlar silinir:
   ```sql
   DROP TABLE IF EXISTS public.pending_task_assignments;
   DROP TABLE IF EXISTS public.workspace_member_university_scopes;
   DROP TABLE IF EXISTS public.workspace_invitations;
   DROP TABLE IF EXISTS public.workspace_members;
   DROP TABLE IF EXISTS public.workspace_settings;
   DROP TABLE IF EXISTS public.workspaces;
   ```
3. `profiles` tablosu üzerindeki eski kısıtlar ve tetikleyiciler (`handle_new_user`) eski SQL şemasına göre yeniden yüklenip etkinleştirilir.

---

## 11. Updated Test Matrix (Güncellenmiş Test Matrisi)

| Test Senaryosu | Test Tipi | Beklenen Davranış / Sonuç |
| :--- | :--- | :--- |
| **Son Owner Rol Düşürme** | Birim (SQL/Trigger) | Tetikleyici hata fırlatmalı, işlem iptal edilmeli. |
| **Son Owner Üyelik Silme** | Birim (SQL/Trigger) | Tetikleyici hata fırlatmalı, işlem iptal edilmeli. |
| **Eşzamanlı Davet Kabulü** | Entegrasyon (Concurrency) | Birinci istek başarıyla üye kaydetmeli, ikinci istek `INVALID_OR_EXPIRED_INVITATION` hatası almalı. |
| **Kapsam Dışı Üniversite Erişimi** | Güvenlik (RLS) | `university_representative` rolündeki kullanıcı, kapsam tablosunda eşleşmeyen üniversite verisini okuyamamalı. |
| **Workspace İçi MFA Engeli** | Güvenlik (RLS/MFA) | Owner aal1 (single-factor) seviyesindeyken, workspace altındaki görev sorguları boş dönmeli. |
| **Hiç Ekipten Davet Almayan Kullanıcı**| Arayüz (Router) | GoRouter, kullanıcının dashboard yerine `/onboarding` rotasına düşmesini sağlamalı. |
