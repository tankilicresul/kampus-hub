import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Search, Plus, RefreshCw, X,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Sparkles,
  Trash2, AlertTriangle, Link
} from 'lucide-react';

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CanvasCellData {
  rowIdx: number;
  colIdx: number;
  status: 'empty' | 'suggested' | 'selected' | 'planned' | 'doing' | 'waiting' | 'done' | 'not_needed';
  workflowName: string;
  description: string;
  purpose: string;
  assigneeId?: string;
  supportingIds?: string[];
  startDate?: string;
  endDate?: string;
  priority: 'low' | 'normal' | 'high';
  checklist: { id: string; text: string; done: boolean }[];
  successCriteria: string;
  kpi: string;
  notes: string;
  files: string[];
  dependencies: string[]; // values format "rowIdx-colIdx"
}

// Default 20 Project Phases (Rows)
const DEFAULT_PHASES = [
  "Fikir ve Problem Keşfi",
  "Pazar ve Kullanıcı Araştırması",
  "Strateji ve İş Modeli",
  "Fikir Doğrulama",
  "Proje Planlama",
  "Ürün Tasarımı",
  "Teknik Mimari",
  "Yazılım Geliştirme",
  "Veri ve Analitik",
  "Güvenlik ve Uyumluluk",
  "Marka Hazırlığı",
  "Pazarlama Hazırlığı",
  "Satış Hazırlığı",
  "Operasyon Hazırlığı",
  "Pilot ve Beta Testi",
  "Lansman",
  "Müşteri Desteği",
  "Büyüme ve Optimizasyon",
  "Ölçekleme",
  "Yatırım ve Kurumsallaşma"
];

// Default 20 Departments (Columns)
const DEFAULT_DEPARTMENTS = [
  "Yönetim ve Strateji",
  "Araştırma",
  "Ürün Yönetimi",
  "Tasarım",
  "Yazılım",
  "Veri ve Analitik",
  "Güvenlik",
  "Hukuk ve Uyumluluk",
  "Pazarlama",
  "Satış",
  "İş Geliştirme",
  "Operasyon",
  "Müşteri Desteği",
  "Müşteri Başarısı",
  "Finans",
  "İnsan Kaynakları",
  "Kalite Güvence",
  "Büyüme",
  "Kurumsal İletişim",
  "Yatırımcı İlişkileri"
];

// Default pre-populated dataset for "Kampüs Kapında Yeni Üniversite Lansmanı"
const getDefaultCells = (): CanvasCellData[] => {
  return [
    {
      rowIdx: 1, // Pazar ve Kullanıcı Araştırması
      colIdx: 1, // Araştırma
      status: 'done',
      workflowName: "Kantin Hedef Kitle Problem Analizi",
      description: "Üniversite öğrencilerinin kantin sipariş ve ödeme süreçlerindeki sorunlarını tespit etmek amacıyla anket ve derinlemesine mülakatlar yapılması.",
      purpose: "Uygulama öncesi kullanıcı problemlerinin tam olarak haritalandırılması.",
      priority: 'high',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      checklist: [
        { id: '1', text: '100 öğrenci ile anket çalışması', done: true },
        { id: '2', text: '5 kantin sahibi ile mülakat', done: true }
      ],
      successCriteria: "Raporun yönetim tarafından onaylanması",
      kpi: "Anket katılım oranı %80",
      notes: "Öğrenciler sıradan şikayetçi.",
      files: [],
      dependencies: []
    },
    {
      rowIdx: 4, // Proje Planlama
      colIdx: 0, // Yönetim ve Strateji
      status: 'done',
      workflowName: "Üniversite Lansman Yol Haritası",
      description: "Lansman gününe kadar yapılacak ana mil taşlarının belirlenmesi ve pazarlama/saha operasyon bütçelerinin onaylanması.",
      purpose: "Proje kaynaklarını ve zaman planını sabitlemek.",
      priority: 'high',
      startDate: '2026-07-05',
      endDate: '2026-07-12',
      checklist: [],
      successCriteria: "Bütçe onayı",
      kpi: "Planlama sapma payı < %5",
      notes: "",
      files: [],
      dependencies: ['1-1'] // depends on Pazar Araştırması
    },
    {
      rowIdx: 5, // Ürün Tasarımı
      colIdx: 3, // Tasarım
      status: 'doing',
      workflowName: "Mobil Sipariş Arayüzü & Prototip",
      description: "Mobil uygulama için kullanıcı dostu kantin sipariş ekranlarının tasarlanması ve test edilmesi.",
      purpose: "Tasarım onayı almak.",
      priority: 'high',
      startDate: '2026-07-10',
      endDate: '2026-07-25',
      checklist: [
        { id: '1', text: 'Wireframe çizimleri', done: true },
        { id: '2', text: 'Figma UI Kit hazırlığı', done: false }
      ],
      successCriteria: "Müşteri testi başarısı",
      kpi: "Kullanılabilirlik skoru > 8.5/10",
      notes: "",
      files: [],
      dependencies: ['4-0'] // depends on Proje Planlama
    },
    {
      rowIdx: 7, // Yazılım Geliştirme
      colIdx: 4, // Yazılım
      status: 'planned',
      workflowName: "Sipariş ve Ödeme Altyapısı Entegrasyonu",
      description: "Kantin sipariş API'lerinin yazılması ve ödeme geçidinin kodlanması.",
      purpose: "Uçtan uca sipariş akışının çalışması.",
      priority: 'high',
      startDate: '2026-07-25',
      endDate: '2026-08-15',
      checklist: [],
      successCriteria: "Crash free rate > %99",
      kpi: "Lansman günü çalışma durumu",
      notes: "",
      files: [],
      dependencies: ['5-3'] // depends on Ürün Tasarımı
    },
    {
      rowIdx: 9, // Güvenlik ve Uyumluluk
      colIdx: 7, // Hukuk ve Uyumluluk
      status: 'selected',
      workflowName: "KVKK Uyum ve Üyelik Sözleşmesi",
      description: "Kullanıcı verilerinin işlenmesi, KVKK açık rıza metinlerinin ve üyelik sözleşmelerinin hazırlanması.",
      purpose: "Yasal uyumluluk sağlamak.",
      priority: 'normal',
      startDate: '2026-07-20',
      endDate: '2026-07-30',
      checklist: [],
      successCriteria: "Hukuk onayı",
      kpi: "Risk raporu 0 bulgu",
      notes: "",
      files: [],
      dependencies: []
    },
    {
      rowIdx: 10, // Marka Hazırlığı
      colIdx: 8, // Pazarlama
      status: 'doing',
      workflowName: "Lansman Görsel Kimliği",
      description: "Sosyal medya postları, broşürler ve stant giydirmeleri için marka logosunun ve renk paletinin hazırlanması.",
      purpose: "Marka bilinirliğini artıracak görsellerin hazır olması.",
      priority: 'normal',
      startDate: '2026-07-15',
      endDate: '2026-07-28',
      checklist: [],
      successCriteria: "Sosyal medya kiti onayı",
      kpi: "Takipçi hedefi 500",
      notes: "",
      files: [],
      dependencies: []
    },
    {
      rowIdx: 11, // Pazarlama Hazırlığı
      colIdx: 8, // Pazarlama
      status: 'planned',
      workflowName: "Sosyal Medya Influencer Anlaşmaları",
      description: "Kampüs içi popüler öğrencilerle tanıtım ve sponsorluk anlaşmalarının yapılması.",
      purpose: "Lansman günü kampüste viral etki yaratmak.",
      priority: 'normal',
      startDate: '2026-07-25',
      endDate: '2026-08-05',
      checklist: [],
      successCriteria: "Lansman kiti teslimi",
      kpi: "Stant ziyaret hedefi 1000",
      notes: "",
      files: [],
      dependencies: ['10-8'] // depends on Marka Hazırlığı
    },
    {
      rowIdx: 15, // Lansman
      colIdx: 8, // Pazarlama
      status: 'waiting',
      workflowName: "Lansman Kampüs İçi Tanıtım",
      description: "Açılış günü stant kurulması, ücretsiz promosyon kodlarının dağıtılması ve influencer çekimleri.",
      purpose: "İlk günde en az 500 aktif kullanıcı kazanmak.",
      priority: 'high',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      checklist: [],
      successCriteria: "İlk günn 500 sipariş",
      kpi: "Aktif kullanıcı > 1000",
      notes: "",
      files: [],
      dependencies: ['11-8', '7-4'] // depends on Pazarlama Hazırlığı & Yazılım
    },
    {
      rowIdx: 15, // Lansman
      colIdx: 11, // Operasyon
      status: 'planned',
      workflowName: "Lansman Saha Operasyonu",
      description: "Stantların kurulması, sipariş alan öğrencilerin yönlendirilmesi ve kantinlerde oluşabilecek yoğunluğun yönetilmesi.",
      purpose: "Lansman gününün sorunsuz atlatılması.",
      priority: 'high',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      checklist: [],
      successCriteria: "Sıfır operasyonel aksaklık",
      kpi: "Teslimat süresi < 15 dk",
      notes: "",
      files: [],
      dependencies: ['4-0'] // depends on Proje Planlama
    },
    {
      rowIdx: 17, // Büyüme ve Optimizasyon
      colIdx: 5, // Veri ve Analitik
      status: 'suggested',
      workflowName: "Huni Dönüşüm Oranları Takibi",
      description: "Kullanıcı davranışlarının analiz edilmesi ve huni dönüşüm oranlarının takibi.",
      purpose: "Büyüme stratejisini belirlemek.",
      priority: 'normal',
      startDate: '2026-08-15',
      endDate: '2026-08-30',
      checklist: [],
      successCriteria: "A/B testi sonuçları",
      kpi: "Dönüşüm artışı %10",
      notes: "",
      files: [],
      dependencies: ['15-8'] // depends on Lansman
    }
  ];
};

export const TasksScreen: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Navigation & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [showDependencies, setShowDependencies] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Focus Mode Toggle (Collapse Matrix to selected/active items only)
  const [showAllGrid, setShowAllGrid] = useState<boolean>(false);

  // Dynamic Grid Rows & Columns
  const [phases, setPhases] = useState<string[]>(DEFAULT_PHASES);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);

  // Canvas State per Workspace
  const [cells, setCells] = useState<CanvasCellData[]>([]);
  const [projectName, setProjectName] = useState<string>("Kampüs Kapında Yeni Üniversite Lansmanı");

  // Selection & Details Panel
  const [editingCellData, setEditingCellData] = useState<CanvasCellData | null>(null);

  // Minimal Search
  const [searchQuery, setSearchQuery] = useState('');

  // AI Workflow Generator Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiQuestions, setAiQuestions] = useState({
    projectType: 'Teknoloji girişimi',
    stage: 'Fikir / Problem Keşfi',
    targetCustomer: 'Üniversite Öğrencileri',
    teamSize: '1-5 Kişi',
    departments: 'Strateji, Yazılım, Pazarlama',
    launchDate: '3 Ay Sonra',
    revenueModel: 'Komisyon bazlı',
    hasPhysicalOps: 'Evet',
    legalRequirements: 'KVKK ve Veri Güvenliği'
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);

  // Create Project Modal
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjType, setNewProjType] = useState('SaaS');

  // Load members from database
  const loadMembers = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, profiles:profiles!workspace_members_user_id_fkey(full_name, avatar_url)')
        .eq('workspace_id', activeWorkspace.id);
      if (data) {
        setMembers(data.map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name || null,
          avatar_url: m.profiles?.avatar_url || null,
        })));
      }
    } catch (err) {
      console.error('Load members failed:', err);
    }
  }, [activeWorkspace?.id]);

  // Load Canvas state from localStorage on init/workspace change
  useEffect(() => {
    loadMembers();
    if (!activeWorkspace?.id) return;

    const savedCells = localStorage.getItem(`canvas_cells_${activeWorkspace.id}`);
    const savedProjName = localStorage.getItem(`canvas_proj_name_${activeWorkspace.id}`);
    const savedPhases = localStorage.getItem(`canvas_phases_${activeWorkspace.id}`);
    const savedDepts = localStorage.getItem(`canvas_depts_${activeWorkspace.id}`);

    if (savedCells) {
      setCells(JSON.parse(savedCells));
    } else {
      // Prefill with Kampüs Kapında Example Data for the workspace
      const defaultCells = getDefaultCells();
      setCells(defaultCells);
      localStorage.setItem(`canvas_cells_${activeWorkspace.id}`, JSON.stringify(defaultCells));
    }

    if (savedProjName) {
      setProjectName(savedProjName);
    } else {
      setProjectName("Kampüs Kapında Yeni Üniversite Lansmanı");
    }

    if (savedPhases) {
      setPhases(JSON.parse(savedPhases));
    } else {
      setPhases(DEFAULT_PHASES);
    }

    if (savedDepts) {
      setDepartments(JSON.parse(savedDepts));
    } else {
      setDepartments(DEFAULT_DEPARTMENTS);
    }
  }, [activeWorkspace?.id, loadMembers]);

  // Save changes helper
  const saveCanvasData = (newCells: CanvasCellData[], newProjName?: string, newPhases?: string[], newDepts?: string[]) => {
    if (!activeWorkspace?.id) return;
    setCells(newCells);
    localStorage.setItem(`canvas_cells_${activeWorkspace.id}`, JSON.stringify(newCells));
    
    if (newProjName !== undefined) {
      setProjectName(newProjName);
      localStorage.setItem(`canvas_proj_name_${activeWorkspace.id}`, newProjName);
    }
    if (newPhases !== undefined) {
      setPhases(newPhases);
      localStorage.setItem(`canvas_phases_${activeWorkspace.id}`, JSON.stringify(newPhases));
    }
    if (newDepts !== undefined) {
      setDepartments(newDepts);
      localStorage.setItem(`canvas_depts_${activeWorkspace.id}`, JSON.stringify(newDepts));
    }
  };

  // Add Dynamic Row / Column
  const handleAddPhase = () => {
    const name = prompt("Yeni Proje Aşaması Adı:");
    if (name && name.trim()) {
      const updated = [...phases, name.trim()];
      saveCanvasData(cells, projectName, updated, departments);
    }
  };

  const handleAddDept = () => {
    const name = prompt("Yeni Departman Adı:");
    if (name && name.trim()) {
      const updated = [...departments, name.trim()];
      saveCanvasData(cells, projectName, phases, updated);
    }
  };

  // Handle Cell Click
  const handleCellClick = (rowIdx: number, colIdx: number) => {
    const existing = cells.find(c => c.rowIdx === rowIdx && c.colIdx === colIdx);

    if (existing) {
      setEditingCellData({ ...existing });
    } else {
      // Initialize an empty cell structure
      setEditingCellData({
        rowIdx,
        colIdx,
        status: 'empty',
        workflowName: `${phases[rowIdx]} × ${departments[colIdx]}`,
        description: '',
        purpose: '',
        priority: 'normal',
        checklist: [],
        successCriteria: '',
        kpi: '',
        notes: '',
        files: [],
        dependencies: []
      });
    }
  };

  // Save Detail Panel changes
  const handleSaveCellData = () => {
    if (!editingCellData) return;
    const filterOut = cells.filter(c => !(c.rowIdx === editingCellData.rowIdx && c.colIdx === editingCellData.colIdx));
    const newCells = [...filterOut, editingCellData];
    saveCanvasData(newCells);
    setEditingCellData(null);
  };

  // Delete cell workflow
  const handleDeleteCellWorkflow = () => {
    if (!editingCellData) return;
    const newCells = cells.filter(c => !(c.rowIdx === editingCellData.rowIdx && c.colIdx === editingCellData.colIdx));
    saveCanvasData(newCells);
    setEditingCellData(null);
  };

  // Quick cycle state click
  const handleCellRightClick = (e: React.MouseEvent, rowIdx: number, colIdx: number) => {
    e.preventDefault();
    const cycleStates: CanvasCellData['status'][] = ['empty', 'suggested', 'selected', 'planned', 'doing', 'waiting', 'done', 'not_needed'];
    const existing = cells.find(c => c.rowIdx === rowIdx && c.colIdx === colIdx);

    let nextStatus: CanvasCellData['status'] = 'suggested';
    if (existing) {
      const currentIdx = cycleStates.indexOf(existing.status);
      nextStatus = cycleStates[(currentIdx + 1) % cycleStates.length];
    }

    const updatedCell: CanvasCellData = existing 
      ? { ...existing, status: nextStatus }
      : {
          rowIdx,
          colIdx,
          status: nextStatus,
          workflowName: `${phases[rowIdx]} × ${departments[colIdx]}`,
          description: '',
          purpose: '',
          priority: 'normal',
          checklist: [],
          successCriteria: '',
          kpi: '',
          notes: '',
          files: [],
          dependencies: []
        };

    const filterOut = cells.filter(c => !(c.rowIdx === rowIdx && c.colIdx === colIdx));
    saveCanvasData([...filterOut, updatedCell]);
  };

  // AI suggestion apply handler
  const handleApplyAISuggestions = () => {
    if (!aiSuggestions) return;
    const filterOut = cells.filter(c => !aiSuggestions.some(a => a.rowIdx === c.rowIdx && a.colIdx === c.colIdx));
    const newCells = [...filterOut, ...aiSuggestions];
    saveCanvasData(newCells);
    setShowAIModal(false);
    setAiSuggestions(null);
  };

  // Create Project handler
  const handleCreateNewProject = () => {
    if (!newProjName.trim()) return;
    let defaultCells: CanvasCellData[] = [];
    if (newProjType === 'Teknoloji girişimi' || newProjType === 'SaaS') {
      defaultCells = getDefaultCells();
    }
    saveCanvasData(defaultCells, newProjName.trim(), DEFAULT_PHASES, DEFAULT_DEPARTMENTS);
    setShowNewProjModal(false);
    setNewProjName('');
  };

  // Simulating AI recommendation build
  const runAISimulation = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const generated: CanvasCellData[] = [
        {
          rowIdx: 0, // Fikir ve Problem Keşfi
          colIdx: 1, // Araştırma
          status: 'suggested',
          workflowName: "Kullanıcı Mülakatları Planı",
          description: "AI Önerisi: Hedef kitleniz üniversite öğrencileri olduğu için kantinlerde doğrudan saha mülakatları yapılması kritik.",
          purpose: "Sorunları ilk ağızdan doğrulamak.",
          priority: 'high',
          checklist: [{ id: '1', text: 'Görüşme soru listesi hazırla', done: false }],
          successCriteria: "En az 20 görüşmenin tamamlanması",
          kpi: "Öğrenci başına ortalama görüşme süresi > 10 dk",
          notes: "AI tarafından otomatik önerilmiştir.",
          files: [],
          dependencies: []
        },
        {
          rowIdx: 2, // Strateji ve İş Modeli
          colIdx: 14, // Finans
          status: 'suggested',
          workflowName: "Finansal Gelir Projeksiyonu",
          description: "AI Önerisi: Komisyon bazlı gelir modeli için tahmini işlem hacmi ve kârlılık planlama tablolarının hazırlanması.",
          purpose: "İlk yıl nakit akışını yönetmek.",
          priority: 'normal',
          checklist: [],
          successCriteria: "Yönetim Kurulu onaylı bütçe sunumu",
          kpi: "3 yıllık projeksiyon doğruluğu",
          notes: "AI tarafından otomatik önerilmiştir.",
          files: [],
          dependencies: []
        },
        {
          rowIdx: 7, // Yazılım Geliştirme
          colIdx: 4, // Yazılım
          status: 'planned',
          workflowName: "Kantin Sipariş API Entegrasyonu",
          description: "AI Önerisi: Altyapınız için yüksek trafik destekleyecek Node.js & Postgres altyapısının kurulması.",
          purpose: "Sipariş kuyruğu oluşturmak.",
          priority: 'high',
          checklist: [],
          successCriteria: "Yük testi raporu",
          kpi: "Yanıt süresi < 200ms",
          notes: "AI tarafından otomatik önerilmiştir.",
          files: [],
          dependencies: []
        }
      ];
      setAiSuggestions(generated);
      setAiGenerating(false);
    }, 1500);
  };

  // Helper values for sizes
  const cellSize = 130 * zoom;
  const rowHeaderWidth = 190 * zoom;
  const colHeaderHeight = 65 * zoom;

  // Collapse grid calculations: active row and column indices
  const activeRowIndices = showAllGrid 
    ? phases.map((_, i) => i) 
    : Array.from(new Set(cells.filter(c => c.status !== 'empty' && c.status !== 'not_needed').map(c => c.rowIdx))).sort((a, b) => a - b);

  const activeColIndices = showAllGrid 
    ? departments.map((_, i) => i) 
    : Array.from(new Set(cells.filter(c => c.status !== 'empty' && c.status !== 'not_needed').map(c => c.colIdx))).sort((a, b) => a - b);

  const visibleRowIndices = (activeRowIndices.length === 0) ? [0, 1, 2, 3, 4] : activeRowIndices;
  const visibleColIndices = (activeColIndices.length === 0) ? [0, 1, 2, 3, 4] : activeColIndices;

  // Filter cells based on search query
  const getFilteredCells = () => {
    return cells.filter(cell => {
      // If search query is typed, filter accordingly
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = cell.workflowName?.toLowerCase().includes(query);
        const descMatch = cell.description?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  };

  const filteredCells = getFilteredCells();

  // Project Progress stats
  const totalTrackedCells = cells.filter(c => c.status !== 'empty' && c.status !== 'not_needed').length;
  const completedCells = cells.filter(c => c.status === 'done').length;
  const completionPercentage = totalTrackedCells > 0 ? Math.round((completedCells / totalTrackedCells) * 100) : 0;

  // Render dependency lines inside matrix dynamically mapping index array positions
  const renderDependencyLines = () => {
    if (!showDependencies) return null;

    const paths: React.ReactNode[] = [];

    cells.forEach(cell => {
      if (cell.dependencies && cell.dependencies.length > 0 && cell.status !== 'empty' && cell.status !== 'not_needed') {
        cell.dependencies.forEach(depStr => {
          const [depRow, depCol] = depStr.split('-').map(Number);
          const target = cells.find(c => c.rowIdx === depRow && c.colIdx === depCol);

          if (target && target.status !== 'empty' && target.status !== 'not_needed') {
            // Find positions in visible row/col array
            const targetColRenderIdx = visibleColIndices.indexOf(depCol);
            const targetRowRenderIdx = visibleRowIndices.indexOf(depRow);
            const cellColRenderIdx = visibleColIndices.indexOf(cell.colIdx);
            const cellRowRenderIdx = visibleRowIndices.indexOf(cell.rowIdx);

            // Draw line only if both endpoints are currently visible in the collapsed grid!
            if (targetColRenderIdx >= 0 && targetRowRenderIdx >= 0 && cellColRenderIdx >= 0 && cellRowRenderIdx >= 0) {
              const x1 = rowHeaderWidth + targetColRenderIdx * cellSize + cellSize / 2;
              const y1 = colHeaderHeight + targetRowRenderIdx * cellSize + cellSize / 2;

              const x2 = rowHeaderWidth + cellColRenderIdx * cellSize + cellSize / 2;
              const y2 = colHeaderHeight + cellRowRenderIdx * cellSize + cellSize / 2;

              paths.push(
                <path
                  key={`${depStr}->${cell.rowIdx}-${cell.colIdx}`}
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  markerEnd="url(#arrow)"
                  style={{ opacity: 0.75 }}
                />
              );
            }
          }
        });
      }
    });

    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-color)" />
          </marker>
        </defs>
        {paths}
      </svg>
    );
  };

  return (
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      
      {/* 3D and minimal styling overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .matrix-wrapper {
          overflow: auto;
          max-width: 100%;
          max-height: 68vh;
          position: relative;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-glass);
          background-color: var(--bg-surface-accent);
          scrollbar-width: thin;
        }
        .matrix-grid {
          display: grid;
          position: relative;
        }
        .matrix-corner-cell {
          position: sticky;
          left: 0;
          top: 0;
          z-index: 30;
          background-color: var(--bg-surface);
          border-right: 2px solid var(--border-color);
          border-bottom: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          color: var(--text-primary);
          text-align: center;
          padding: 8px;
        }
        .matrix-col-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background-color: var(--bg-surface);
          border-bottom: 2px solid var(--border-color);
          border-right: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--text-secondary);
          text-align: center;
          padding: 6px;
          line-height: 1.2;
        }
        .matrix-row-header {
          position: sticky;
          left: 0;
          z-index: 20;
          background-color: var(--bg-surface);
          border-right: 2px solid var(--border-color);
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--text-secondary);
          padding: 8px 12px;
          line-height: 1.25;
        }
        .matrix-cell {
          border-right: 1px solid var(--border-glass);
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-surface);
          position: relative;
          user-select: none;
        }
        
        /* Premium 3D block effects */
        .matrix-cell-3d {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateY(-2px);
          will-change: transform, box-shadow;
          border-radius: 12px;
          margin: 6px;
          height: calc(100% - 12px) !important;
          width: calc(100% - 12px) !important;
        }
        .matrix-cell-3d:hover {
          transform: translateY(-6px) !important;
        }
        
        .fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background-color: var(--bg-main);
          padding: 24px !important;
        }
      `}} />

      {/* ── MINIMAL ÜST KONTROL ALANI (Minimal Header Control Panel) ────────────── */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{projectName}</h1>
              <span className="badge badge-accent" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>%{completionPercentage} Tamamlandı</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Aktif: <strong>{totalTrackedCells} Aşama</strong> • Tamamlanan: <strong>{completedCells}</strong>
            </p>
          </div>

          {/* Minimal Controls Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            
            {/* Minimal Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Arama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '130px', paddingLeft: '28px', paddingRight: '8px', height: '32px', fontSize: '0.78rem' }}
              />
            </div>

            {/* Toggle showAllGrid (iOS pill style layout) */}
            <button
              onClick={() => setShowAllGrid(!showAllGrid)}
              className={`btn ${showAllGrid ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                height: '32px',
                padding: '0 12px',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {showAllGrid ? '🔒 Sadeleştir' : '🔓 Düzenleme Modu (Boşları Göster)'}
            </button>

            <button 
              className={`btn ${showDependencies ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setShowDependencies(!showDependencies)}
              style={{ height: '32px', padding: '0 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Link size={13} />
              Bağımlılıklar
            </button>

            <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--bg-surface-accent)', borderRadius: '8px', padding: '2px' }}>
              <button className="btn btn-secondary" style={{ padding: '5px 8px', border: 'none', background: 'transparent' }} onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))} title="Uzaklaştır"><ZoomOut size={13} /></button>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0 6px', alignSelf: 'center', color: 'var(--text-secondary)' }}>%{Math.round(zoom * 100)}</span>
              <button className="btn btn-secondary" style={{ padding: '5px 8px', border: 'none', background: 'transparent' }} onClick={() => setZoom(prev => Math.min(1.4, prev + 0.1))} title="Yakınlaştır"><ZoomIn size={13} /></button>
            </div>

            <button className="btn btn-secondary" onClick={() => setShowNewProjModal(true)} style={{ padding: '0 10px', height: '32px', fontSize: '0.76rem' }}>Yeni Proje</button>
            <button className="btn btn-primary" onClick={() => setShowAIModal(true)} style={{ padding: '0 12px', height: '32px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={13} /> AI Önerisi</button>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              style={{ height: '32px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── DİNAMİK SCROLLABLE GRID KANVAS ALANI ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, position: 'relative' }}>
        
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="matrix-wrapper">
            <div className="matrix-grid" style={{
              gridTemplateColumns: `${rowHeaderWidth}px repeat(${visibleColIndices.length}, ${cellSize}px)`,
              gridTemplateRows: `${colHeaderHeight}px repeat(${visibleRowIndices.length}, ${cellSize}px)`,
              width: `${rowHeaderWidth + visibleColIndices.length * cellSize}px`,
              height: `${colHeaderHeight + visibleRowIndices.length * cellSize}px`
            }}>
              
              {/* SVG Connections */}
              {renderDependencyLines()}

              {/* 1. Corner Cell */}
              <div className="matrix-corner-cell" style={{ width: rowHeaderWidth, height: colHeaderHeight }}>
                Süreç Aşaması
              </div>

              {/* 2. Columns Header */}
              {visibleColIndices.map((colIdx) => (
                <div key={colIdx} className="matrix-col-header" style={{ width: cellSize, height: colHeaderHeight }}>
                  {departments[colIdx]}
                </div>
              ))}

              {/* 3. Grid Rows */}
              {visibleRowIndices.map((rowIdx) => (
                <React.Fragment key={rowIdx}>
                  {/* Row Header */}
                  <div className="matrix-row-header" style={{ width: rowHeaderWidth, height: cellSize }}>
                    {phases[rowIdx]}
                  </div>

                  {/* Matrix Cells */}
                  {visibleColIndices.map((colIdx) => {
                    const cellData = cells.find(c => c.rowIdx === rowIdx && c.colIdx === colIdx);
                    const isFilteredOut = cellData && !filteredCells.some(f => f.rowIdx === rowIdx && f.colIdx === colIdx);

                    // Style variables based on status representing premium 3D look
                    let borderStyle = '1px dashed var(--border-glass)';
                    let bgStyle = 'transparent';
                    let statusBadge = '';
                    let badgeColor = 'var(--text-muted)';
                    let opacity = isFilteredOut ? 0.3 : 1;
                    let bottomBorderColor = 'transparent';

                    if (cellData && cellData.status !== 'empty') {
                      switch (cellData.status) {
                        case 'suggested':
                          borderStyle = `1px solid #3b82f6`;
                          bottomBorderColor = '#1d4ed8'; // Darker blue for 3D thickness
                          bgStyle = 'rgba(59, 130, 246, 0.08)';
                          statusBadge = '✨ Öneri';
                          badgeColor = '#3b82f6';
                          break;
                        case 'selected':
                          borderStyle = `1px solid #6366f1`;
                          bottomBorderColor = '#4338ca'; // Darker indigo
                          bgStyle = 'rgba(99, 102, 241, 0.08)';
                          statusBadge = '☑ Seçildi';
                          badgeColor = '#6366f1';
                          break;
                        case 'planned':
                          borderStyle = `1px solid #a855f7`;
                          bottomBorderColor = '#7e22ce'; // Darker purple
                          bgStyle = 'rgba(168, 85, 247, 0.08)';
                          statusBadge = '📅 Plan';
                          badgeColor = '#a855f7';
                          break;
                        case 'doing':
                          borderStyle = `1px solid #f59e0b`;
                          bottomBorderColor = '#b45309'; // Darker amber
                          bgStyle = 'rgba(245, 158, 11, 0.08)';
                          statusBadge = '⚡ Süreç';
                          badgeColor = '#f59e0b';
                          break;
                        case 'waiting':
                          borderStyle = `1px solid #f97316`;
                          bottomBorderColor = '#c2410c'; // Darker orange
                          bgStyle = 'rgba(249, 115, 22, 0.08)';
                          statusBadge = '⏳ Bekle';
                          badgeColor = '#f97316';
                          break;
                        case 'done':
                          borderStyle = `1px solid #10b981`;
                          bottomBorderColor = '#047857'; // Darker emerald
                          bgStyle = 'rgba(16, 185, 129, 0.08)';
                          statusBadge = '✅ Bitti';
                          badgeColor = '#10b981';
                          break;
                        case 'not_needed':
                          borderStyle = '1px solid var(--border-color)';
                          bottomBorderColor = '#64748b';
                          bgStyle = 'rgba(148, 163, 184, 0.1)';
                          statusBadge = '🚫 Pasif';
                          badgeColor = 'var(--text-muted)';
                          break;
                      }
                    }

                    const isOverdue = cellData && cellData.endDate && cellData.status !== 'done' && new Date(cellData.endDate) < new Date();

                    return (
                      <div
                        key={colIdx}
                        className="matrix-cell"
                        style={{ width: cellSize, height: cellSize }}
                      >
                        {cellData && cellData.status !== 'empty' ? (
                          <div
                            onClick={() => handleCellClick(rowIdx, colIdx)}
                            onContextMenu={(e) => handleCellRightClick(e, rowIdx, colIdx)}
                            className="matrix-cell-3d"
                            style={{
                              border: borderStyle,
                              borderBottom: `5px solid ${bottomBorderColor}`,
                              backgroundColor: bgStyle,
                              opacity,
                              boxShadow: '0 6px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            {/* Workflow Name */}
                            <div style={{
                              fontSize: zoom < 0.8 ? '0.62rem' : '0.72rem',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                              lineHeight: 1.25,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {cellData.workflowName}
                            </div>

                            {/* Footer content */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                              {zoom >= 0.8 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: badgeColor }}>
                                    {statusBadge}
                                  </span>
                                  {isOverdue && (
                                    <span title="Gecikmiş Süreç!" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}>
                                      <AlertTriangle size={11} />
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Progress bar */}
                              {cellData.checklist && cellData.checklist.length > 0 && zoom >= 0.7 && (
                                <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--border-glass)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${(cellData.checklist.filter(c => c.done).length / cellData.checklist.length) * 100}%`,
                                    height: '100%',
                                    backgroundColor: badgeColor
                                  }} />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          showAllGrid && (
                            <div
                              onClick={() => handleCellClick(rowIdx, colIdx)}
                              onContextMenu={(e) => handleCellRightClick(e, rowIdx, colIdx)}
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: borderStyle,
                                color: 'var(--text-muted)',
                                fontSize: '0.7rem',
                                opacity: 0.25,
                                cursor: 'pointer'
                              }}
                            >
                              <Plus size={11} /> Ekle
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Helper notes beneath canvas */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            {showAllGrid && (
              <>
                <button className="btn btn-secondary" onClick={handleAddPhase} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>+ Yeni Aşama (Satır) Ekle</button>
                <button className="btn btn-secondary" onClick={handleAddDept} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>+ Yeni Departman (Sütun) Ekle</button>
              </>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              💡 <em>Sadece ekli/seçili hücreleri görmektesiniz. Yeni hücre eklemek için <strong>Düzenleme Modu</strong>'nu açabilirsiniz.</em>
            </div>
          </div>
        </div>

        {/* ── DETAY PANELİ (Cell Detail Panel) ─────────────────────────────────── */}
        {editingCellData && (
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', overflowY: 'auto', borderLeft: '2px solid var(--border-color)', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Süreç Bilgileri</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Row {editingCellData.rowIdx} × Col {editingCellData.colIdx}</p>
              </div>
              <button onClick={() => { setEditingCellData(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>İş Akışı / Süreç Adı</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCellData.workflowName}
                  onChange={e => setEditingCellData({ ...editingCellData, workflowName: e.target.value })}
                  style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Durum</label>
                  <select
                    className="form-input"
                    value={editingCellData.status}
                    onChange={e => setEditingCellData({ ...editingCellData, status: e.target.value as any })}
                    style={{ fontSize: '0.82rem', height: '34px', padding: '0 8px' }}
                  >
                    <option value="empty">Boş</option>
                    <option value="suggested">Önerilen</option>
                    <option value="selected">Seçildi</option>
                    <option value="planned">Planlandı</option>
                    <option value="doing">Sürüyor</option>
                    <option value="waiting">Beklemede</option>
                    <option value="done">Tamamlandı</option>
                    <option value="not_needed">Gerekli Değil</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Öncelik</label>
                  <select
                    className="form-input"
                    value={editingCellData.priority}
                    onChange={e => setEditingCellData({ ...editingCellData, priority: e.target.value as any })}
                    style={{ fontSize: '0.82rem', height: '34px', padding: '0 8px' }}
                  >
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Sorumlu Kişi</label>
                <select
                  className="form-input"
                  value={editingCellData.assigneeId || ''}
                  onChange={e => setEditingCellData({ ...editingCellData, assigneeId: e.target.value || undefined })}
                  style={{ fontSize: '0.82rem', height: '34px', padding: '0 8px' }}
                >
                  <option value="">Atanmamış</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Süreç Açıklaması</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={editingCellData.description}
                  onChange={e => setEditingCellData({ ...editingCellData, description: e.target.value })}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Süreç Amacı / Hedefi</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCellData.purpose}
                  onChange={e => setEditingCellData({ ...editingCellData, purpose: e.target.value })}
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Başlangıç Tarihi</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingCellData.startDate || ''}
                    onChange={e => setEditingCellData({ ...editingCellData, startDate: e.target.value })}
                    style={{ fontSize: '0.8rem', height: '34px', padding: '0 8px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Bitiş Tarihi</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingCellData.endDate || ''}
                    onChange={e => setEditingCellData({ ...editingCellData, endDate: e.target.value })}
                    style={{ fontSize: '0.8rem', height: '34px', padding: '0 8px' }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kontrol Listesi / Alt Görevler</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {editingCellData.checklist?.filter(c => c.done).length || 0} / {editingCellData.checklist?.length || 0}
                  </span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {editingCellData.checklist?.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={e => {
                          const updated = editingCellData.checklist.map(i => i.id === item.id ? { ...i, done: e.target.checked } : i);
                          setEditingCellData({ ...editingCellData, checklist: updated });
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingCellData.checklist.filter(i => i.id !== item.id);
                          setEditingCellData({ ...editingCellData, checklist: updated });
                        }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="Alt görev ekle..."
                      className="form-input"
                      style={{ fontSize: '0.78rem', padding: '4px 8px', height: '28px' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            const updated = [...(editingCellData.checklist || []), { id: Date.now().toString(), text: val, done: false }];
                            setEditingCellData({ ...editingCellData, checklist: updated });
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI / Başarı Kriteri */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Başarı Kriteri & KPI</label>
                <input
                  type="text"
                  placeholder="Başarı Kriteri"
                  className="form-input"
                  value={editingCellData.successCriteria}
                  onChange={e => setEditingCellData({ ...editingCellData, successCriteria: e.target.value })}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', marginBottom: '6px' }}
                />
                <input
                  type="text"
                  placeholder="KPI Değeri (örn. %80 başarı)"
                  className="form-input"
                  value={editingCellData.kpi}
                  onChange={e => setEditingCellData({ ...editingCellData, kpi: e.target.value })}
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                />
              </div>

              {/* Bağımlılıklar Eşleme */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Bağımlı Olduğu Süreçler</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--border-glass)', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>
                  {cells.filter(c => c.status !== 'empty' && !(c.rowIdx === editingCellData.rowIdx && c.colIdx === editingCellData.colIdx)).map(other => {
                    const key = `${other.rowIdx}-${other.colIdx}`;
                    const isChecked = editingCellData.dependencies?.includes(key);
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={e => {
                            let updated = [...(editingCellData.dependencies || [])];
                            if (e.target.checked) {
                              updated.push(key);
                            } else {
                              updated = updated.filter(d => d !== key);
                            }
                            setEditingCellData({ ...editingCellData, dependencies: updated });
                          }}
                        />
                        {other.workflowName}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notlar */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Notlar</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={editingCellData.notes}
                  onChange={e => setEditingCellData({ ...editingCellData, notes: e.target.value })}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Save / Delete actions */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <button className="btn btn-secondary" onClick={handleDeleteCellWorkflow} style={{ padding: '8px', color: 'var(--color-danger)' }} title="Süreci Sıfırla / Sil">
                <Trash2 size={16} />
              </button>
              <button className="btn btn-primary" onClick={handleSaveCellData} style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }}>
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── AI WORKFLOW SUGGESTION MODAL ────────────────────────────────────────── */}
      {showAIModal && (
        <div className="modal-backdrop" onClick={() => setShowAIModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
                AI ile Özel İş Akışı Oluştur
              </span>
              <button onClick={() => setShowAIModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {!aiSuggestions ? (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Aşağıdaki girişim bilgilerini doldurarak AI'ın projenize en uygun kritik kesişim hücrelerini, süreç hedeflerini, alt görevleri ve bağımlılık haritalarını otomatik oluşturmasını sağlayın.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '50vh', overflowY: 'auto', padding: '2px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Girişim / Proje Türü</label>
                      <select className="form-input" style={{ height: '34px', fontSize: '0.8rem' }} value={aiQuestions.projectType} onChange={e => setAiQuestions({ ...aiQuestions, projectType: e.target.value })}>
                        <option>Teknoloji girişimi</option>
                        <option>Mobil uygulama</option>
                        <option>SaaS Platformu</option>
                        <option>E-ticaret Sitesi</option>
                        <option>Pazaryeri (Marketplace)</option>
                        <option>Sosyal Girişim</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Projeniz Hangi Aşamada?</label>
                      <select className="form-input" style={{ height: '34px', fontSize: '0.8rem' }} value={aiQuestions.stage} onChange={e => setAiQuestions({ ...aiQuestions, stage: e.target.value })}>
                        <option>Fikir / Problem Keşfi</option>
                        <option>MVP Geliştirme</option>
                        <option>Lansman Hazırlığı</option>
                        <option>Büyüme & Ölçekleme</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Hedef Müşteri / Kitle</label>
                      <input type="text" className="form-input" style={{ fontSize: '0.8rem' }} value={aiQuestions.targetCustomer} onChange={e => setAiQuestions({ ...aiQuestions, targetCustomer: e.target.value })} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ekip Büyüklüğü</label>
                      <select className="form-input" style={{ height: '34px', fontSize: '0.8rem' }} value={aiQuestions.teamSize} onChange={e => setAiQuestions({ ...aiQuestions, teamSize: e.target.value })}>
                        <option>1-5 Kişi</option>
                        <option>6-15 Kişi</option>
                        <option>15+ Kişi</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Gelir Modeli</label>
                      <input type="text" className="form-input" style={{ fontSize: '0.8rem' }} value={aiQuestions.revenueModel || ''} onChange={e => setAiQuestions({ ...aiQuestions, revenueModel: e.target.value })} placeholder="örn. Aylık abonelik" />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Fiziksel Operasyon Var mı?</label>
                      <select className="form-input" style={{ height: '34px', fontSize: '0.8rem' }} value={aiQuestions.hasPhysicalOps} onChange={e => setAiQuestions({ ...aiQuestions, hasPhysicalOps: e.target.value })}>
                        <option>Evet</option>
                        <option>Hayır</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Hukuki veya Sektörel Özel Gereksinimler var mı?</label>
                      <input type="text" className="form-input" style={{ fontSize: '0.8rem' }} value={aiQuestions.legalRequirements} onChange={e => setAiQuestions({ ...aiQuestions, legalRequirements: e.target.value })} />
                    </div>
                  </div>

                  <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowAIModal(false)}>İptal</button>
                    <button className="btn btn-primary" onClick={runAISimulation} disabled={aiGenerating}>
                      {aiGenerating ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> AI Süreç Haritası Oluşturuyor...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Yapay Zeka Önerisi Hazırla
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Sparkles size={15} /> AI Analiz Raporu & İş Akışı Önerileri
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Girdiğiniz bilgilere dayanarak, projenizin <strong>{aiQuestions.projectType}</strong> yapısı ve <strong>{aiQuestions.stage}</strong> aşaması için kritik öneme sahip 3 kesişim hücresi belirlendi ve önerildi. Aşamaları doğrudan canvasa uygulayabilirsiniz.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aiSuggestions.map((item, idx) => (
                      <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.workflowName}</span>
                          <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>Row {item.rowIdx} × Col {item.colIdx}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => setAiSuggestions(null)}>Geri Dön</button>
                    <button className="btn btn-primary" onClick={handleApplyAISuggestions}>
                      Önerileri Canvas'a Uygula
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── YENİ PROJE MODAL ────────────────────────────────────────────────────── */}
      {showNewProjModal && (
        <div className="modal-backdrop" onClick={() => setShowNewProjModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Yeni İş Akışı Projesi Oluştur</span>
              <button onClick={() => setShowNewProjModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Proje Adı</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  placeholder="örn. Kampüs Kapında Lansmanı"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Proje Türü</label>
                <select 
                  className="form-input" 
                  value={newProjType} 
                  onChange={e => setNewProjType(e.target.value)}
                  style={{ height: '34px', fontSize: '0.8rem' }}
                >
                  <option>Teknoloji girişimi</option>
                  <option>Mobil uygulama</option>
                  <option>SaaS</option>
                  <option>E-ticaret</option>
                  <option>Pazaryeri</option>
                  <option>Sosyal girişim</option>
                  <option>Özel proje</option>
                </select>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setShowNewProjModal(false)}>İptal</button>
                <button className="btn btn-primary" onClick={handleCreateNewProject} disabled={!newProjName.trim()}>
                  Projeyi Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
