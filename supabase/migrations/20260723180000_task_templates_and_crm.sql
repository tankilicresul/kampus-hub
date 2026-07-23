-- Migration: Task Templates Automations and CRM Helpers
-- Date: 2026-07-23

-- Function to generate 24-step university opening tasks template
CREATE OR REPLACE FUNCTION generate_university_opening_tasks(
    p_university_id UUID,
    p_workspace_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task_count INT := 0;
    v_creator UUID := p_created_by;
    v_titles TEXT[] := ARRAY[
        '1. Kampüs Analitiği ve Öğrenci Yoğunluk Haritası Çıkarılması',
        '2. Kampüs Temsilcisi İlanının Yayınlanması',
        '3. Temsilci Başvurularının Değerlendirilmesi',
        '4. Temsilci Mülakatlarının Gerçekleştirilmesi',
        '5. Temsilci Oryantasyon Eğitimi',
        '6. Kampüs İçi Hedef İşletme Listesinin Oluşturulması',
        '7. Saha Ziyaret Rotalarının Belirlenmesi',
        '8. İşletme İlk Temas Ziyaretleri',
        '9. İşletme Sunumu ve Teklif İletimi',
        '10. Sözleşme Görüşmelerinin Tamamlanması',
        '11. İşletme Menü ve Görsel İçeriklerinin Alınması',
        '12. Kampüs Hub İşletme Kaydının Açılması',
        '13. POS / Sipariş Entegrasyon Sistem Kurulumu',
        '14. İşletme Personel Eğitimi',
        '15. WhatsApp İletişim Grubu Oluşturulması',
        '16. Kampüs Açılış Pazarlama Stratejisi Planlanması',
        '17. Reklam Görsel ve Afiş Basımlarının Tamamlanması',
        '18. Kampüs Stant Yerlerinin Belirlenmesi ve İzin Alınması',
        '19. Stant ve Promosyon Malzemelerinin Sevk Edilmesi',
        '20. Kampüs Sosyal Medya Kanalının Açılması',
        '21. Açılış Lansman Kampanyasının Başlatılması',
        '22. İlk Sipariş Testlerinin Yapılması ve Doğrulanması',
        '23. Canlıya Geçiş Duyurusu',
        '24. Haftalık Operasyonel Değerlendirme Toplantısı'
    ];
    v_title TEXT;
    v_idx INT := 1;
BEGIN
    IF p_university_id IS NULL OR p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'university_id and workspace_id are required';
    END IF;

    IF v_creator IS NULL THEN
        v_creator := auth.uid();
    END IF;

    FOREACH v_title IN ARRAY v_titles LOOP
        INSERT INTO tasks (
            title,
            description,
            university_id,
            workspace_id,
            priority,
            status,
            effort_score,
            created_by,
            start_date,
            due_date
        ) VALUES (
            v_title,
            'Otomatik oluşturulan üniversite açılış şablon görevi (Aşama ' || v_idx || ')',
            p_university_id,
            p_workspace_id,
            CASE WHEN v_idx IN (1, 10, 13, 22, 23) THEN 'critical'::task_priority ELSE 'normal'::task_priority END,
            'planned'::task_status,
            3,
            v_creator,
            CURRENT_DATE + (v_idx || ' days')::INTERVAL,
            CURRENT_DATE + ((v_idx + 2) || ' days')::INTERVAL
        );
        v_task_count := v_task_count + 1;
        v_idx := v_idx + 1;
    END LOOP;

    RETURN v_task_count;
END;
$$;

-- Trigger Function on Universities Insertion
CREATE OR REPLACE FUNCTION trigger_generate_university_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ws_id UUID := NEW.workspace_id;
BEGIN
    IF v_ws_id IS NULL THEN
        SELECT id INTO v_ws_id FROM workspaces LIMIT 1;
    END IF;

    IF v_ws_id IS NOT NULL THEN
        PERFORM generate_university_opening_tasks(NEW.id, v_ws_id, NULL);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_university_tasks ON universities;
CREATE TRIGGER trg_auto_generate_university_tasks
    AFTER INSERT ON universities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_university_tasks();

-- Grant permissions to authenticated role
GRANT EXECUTE ON FUNCTION generate_university_opening_tasks(UUID, UUID, UUID) TO authenticated;
