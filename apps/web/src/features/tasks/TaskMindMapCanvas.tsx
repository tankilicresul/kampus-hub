import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Plus, ZoomIn, ZoomOut, Maximize2, X, Calendar, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

/* ────────────────────── Types ────────────────────── */
type TaskStatus = 'todo' | 'in_progress' | 'completed';

interface MindMapNode {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  parentId: string | null;
}

interface MindMapEdge {
  id: string;
  from: string;
  to: string;
}

/* ────────────────────── Constants ────────────────────── */
const NODE_W = 180;
const NODE_H = 110;
const GAP_X = 270;
const GAP_Y = 210;

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; bg: string; icon: React.ReactNode }> = {
  todo:        { color: '#ef4444', label: 'Yapılacak',     bg: 'rgba(239, 68, 68, 0.12)',  icon: <AlertTriangle size={14} /> },
  in_progress: { color: '#ff9f0a', label: 'Devam Ediyor',  bg: 'rgba(255, 159, 10, 0.12)', icon: <Clock size={14} /> },
  completed:   { color: '#22c55e', label: 'Tamamlandı',    bg: 'rgba(34, 197, 94, 0.12)',  icon: <CheckCircle2 size={14} /> },
};

/* ────────────────────── Helpers ────────────────────── */
const uid = () => `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const statusColor = (s: TaskStatus) => STATUS_CONFIG[s].color;

const formatDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const isOverdue = (d: string) => {
  if (!d) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return new Date(d) < now;
};

/**
 * Cubic‑Bézier path from source‑node edge → target‑node edge.
 */
const bezierPath = (from: MindMapNode, to: MindMapNode): string => {
  const fcx = from.x + NODE_W / 2;
  const fcy = from.y + NODE_H / 2;
  const tcx = to.x + NODE_W / 2;
  const tcy = to.y + NODE_H / 2;

  const dx = tcx - fcx;
  const dy = tcy - fcy;

  let sx: number, sy: number, ex: number, ey: number;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) { sx = from.x + NODE_W; sy = fcy; ex = to.x; ey = tcy; }
    else         { sx = from.x;           sy = fcy; ex = to.x + NODE_W; ey = tcy; }
    const cp = Math.max(Math.abs(dx) * 0.45, 40);
    return `M${sx},${sy} C${sx + Math.sign(dx) * cp},${sy} ${ex - Math.sign(dx) * cp},${ey} ${ex},${ey}`;
  } else {
    if (dy >= 0) { sx = fcx; sy = from.y + NODE_H; ex = tcx; ey = to.y; }
    else         { sx = fcx; sy = from.y;           ex = tcx; ey = to.y + NODE_H; }
    const cp = Math.max(Math.abs(dy) * 0.45, 40);
    return `M${sx},${sy} C${sx},${sy + Math.sign(dy) * cp} ${ex},${ey - Math.sign(dy) * cp} ${ex},${ey}`;
  }
};

/* ────────────────────── Edge Component ────────────────────── */
const MindMapEdgeComp = memo(({ d, color }: { d: string; color: string }) => (
  <g>
    <path d={d} className="mindmap-edge-path" style={{ stroke: color }} />
    <circle r="4" className="mindmap-flow-dot" style={{ fill: color }}>
      <animateMotion dur="2.8s" repeatCount="indefinite" path={d} />
    </circle>
  </g>
));
MindMapEdgeComp.displayName = 'MindMapEdgeComp';

/* ────────────────────── Node Component ────────────────────── */
interface NodeProps {
  node: MindMapNode;
  isSelected: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (e: React.MouseEvent, id: string) => void;
  onAddNode: (parentId: string, dir: 'top' | 'right' | 'bottom' | 'left') => void;
  onTitleChange: (id: string, title: string) => void;
  onEditEnd: () => void;
  onDelete: (id: string) => void;
}

const MindMapNodeCard = memo<NodeProps>(({
  node, isSelected, isEditing,
  onMouseDown, onClick, onDoubleClick,
  onAddNode, onTitleChange, onEditEnd, onDelete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const sc = STATUS_CONFIG[node.status];
  const sColor = sc.color;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={`mindmap-node${isSelected ? ' selected' : ''}${node.id === 'root' ? ' root' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_W,
        height: NODE_H,
        '--node-color': sColor,
        borderColor: isSelected ? sColor : undefined,
      } as React.CSSProperties}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onClick={(e) => onClick(e, node.id)}
      onDoubleClick={(e) => onDoubleClick(e, node.id)}
    >
      {/* Status color bar */}
      <div className="mindmap-node-color-bar" style={{ background: sColor }} />

      {/* Content */}
      <div className="mindmap-node-content">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="mindmap-node-input"
            value={node.title}
            onChange={(e) => onTitleChange(node.id, e.target.value)}
            onBlur={onEditEnd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditEnd();
              if (e.key === 'Escape') onEditEnd();
            }}
            placeholder="Görev adı yazın..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="mindmap-node-info">
            <span className={`mindmap-node-title${!node.title ? ' placeholder' : ''}`}>
              {node.title || 'Tıkla ve düzenle'}
            </span>
            {node.dueDate && (
              <span className={`mindmap-node-date${isOverdue(node.dueDate) && node.status !== 'completed' ? ' overdue' : ''}`}>
                <Calendar size={10} />
                {formatDate(node.dueDate)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="mindmap-node-status-badge" style={{ background: sc.bg, color: sColor }}>
        {sc.icon}
        <span>{sc.label}</span>
      </div>

      {/* Delete button (non-root) */}
      {node.id !== 'root' && (
        <button
          className="mindmap-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          title="Sil"
        >
          <X size={12} />
        </button>
      )}

      {/* Plus buttons on 4 edges */}
      {(['top', 'right', 'bottom', 'left'] as const).map((dir) => (
        <button
          key={dir}
          className={`mindmap-plus-btn ${dir}`}
          onClick={(e) => { e.stopPropagation(); onAddNode(node.id, dir); }}
          onMouseDown={(e) => e.stopPropagation()}
          title={dir === 'top' ? 'Yukarı ekle' : dir === 'right' ? 'Sağa ekle' : dir === 'bottom' ? 'Aşağı ekle' : 'Sola ekle'}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
});
MindMapNodeCard.displayName = 'MindMapNodeCard';

/* ────────────────────── Task Detail Modal ────────────────────── */
interface DetailModalProps {
  node: MindMapNode;
  onUpdate: (id: string, updates: Partial<MindMapNode>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const TaskDetailModal: React.FC<DetailModalProps> = ({ node, onUpdate, onClose, onDelete }) => {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description);
  const [dueDate, setDueDate] = useState(node.dueDate);
  const [status, setStatus] = useState<TaskStatus>(node.status);

  // Sync when node changes externally
  useEffect(() => {
    setTitle(node.title);
    setDescription(node.description);
    setDueDate(node.dueDate);
    setStatus(node.status);
  }, [node.id, node.title, node.description, node.dueDate, node.status]);

  const handleSave = () => {
    onUpdate(node.id, { title, description, dueDate, status });
    onClose();
  };

  const sc = STATUS_CONFIG[status];

  return (
    <div className="mindmap-modal-backdrop" onClick={onClose}>
      <div className="mindmap-modal" onClick={(e) => e.stopPropagation()}>
        {/* Status color top bar */}
        <div className="mindmap-modal-status-bar" style={{ background: sc.color }} />

        {/* Header */}
        <div className="mindmap-modal-header">
          <div className="mindmap-modal-header-left">
            <FileText size={20} style={{ color: sc.color }} />
            <span>Görev Detayı</span>
          </div>
          <button className="mindmap-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="mindmap-modal-body">
          {/* Title */}
          <div className="mindmap-modal-field">
            <label>Görev Adı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Görev adını girin..."
              className="mindmap-modal-input"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mindmap-modal-field">
            <label>Görev Tanımı</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görev açıklamasını yazın..."
              className="mindmap-modal-textarea"
              rows={4}
            />
          </div>

          {/* Due Date */}
          <div className="mindmap-modal-field">
            <label>
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              Bitiş Tarihi (Deadline)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mindmap-modal-input"
            />
          </div>

          {/* Status */}
          <div className="mindmap-modal-field">
            <label>Durum</label>
            <div className="mindmap-status-selector">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    className={`mindmap-status-btn${isActive ? ' active' : ''}`}
                    style={{
                      '--status-color': cfg.color,
                      '--status-bg': cfg.bg,
                      background: isActive ? cfg.bg : undefined,
                      color: isActive ? cfg.color : undefined,
                      borderColor: isActive ? cfg.color : undefined,
                    } as React.CSSProperties}
                    onClick={() => setStatus(s)}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mindmap-modal-footer">
          {node.id !== 'root' && (
            <button
              className="mindmap-modal-delete-btn"
              onClick={() => { onDelete(node.id); onClose(); }}
            >
              <X size={14} />
              Sil
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="mindmap-modal-cancel-btn" onClick={onClose}>
            İptal
          </button>
          <button className="mindmap-modal-save-btn" onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────── Main Canvas ────────────────────── */
export const TaskMindMapCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── state ── */
  const [nodes, setNodes] = useState<MindMapNode[]>(() => {
    const saved = localStorage.getItem('kh_mindmap_nodes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved nodes:', e);
      }
    }
    return [
      { id: 'root', x: 0, y: 0, title: 'Merkez Görev', description: '', dueDate: '', status: 'in_progress', parentId: null },
    ];
  });
  const [edges, setEdges] = useState<MindMapEdge[]>(() => {
    const saved = localStorage.getItem('kh_mindmap_edges');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved edges:', e);
      }
    }
    return [];
  });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

  // drag tracking
  const wasDragRef = useRef(false);
  const dragDistRef = useRef(0);

  // interaction refs (avoid stale closures)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const isDraggingNodeRef = useRef(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Sync to localStorage (nodes & edges only)
  useEffect(() => {
    localStorage.setItem('kh_mindmap_nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem('kh_mindmap_edges', JSON.stringify(edges));
  }, [edges]);

  /* ── center on mount (layout & size observer aware) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let centered = false;

    const center = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 100 && r.height > 100 && !centered) {
        setPan({ x: r.width / 2 - NODE_W / 2, y: r.height / 2 - NODE_H / 2 });
        setZoom(1);
        centered = true;
      }
    };

    center();

    // Retries in case of layout animations/transitions
    const timer1 = setTimeout(center, 80);
    const timer2 = setTimeout(center, 250);

    const observer = new ResizeObserver(() => {
      center();
    });
    observer.observe(el);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      observer.disconnect();
    };
  }, []);

  /* ── wheel zoom (non‑passive) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;

      setZoom((prev) => {
        const next = Math.min(3, Math.max(0.15, prev * factor));
        const ratio = next / prev;
        setPan((p: { x: number; y: number }) => ({
          x: mx - (mx - p.x) * ratio,
          y: my - (my - p.y) * ratio,
        }));
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  /* ── pointer handlers (pan + node‑drag) ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target === containerRef.current ||
      target.classList.contains('mindmap-canvas-world') ||
      target.classList.contains('mindmap-svg-layer') ||
      target.classList.contains('mindmap-grid-pattern')
    ) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setSelectedId(null);
      setEditingId(null);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
    if (isDraggingNodeRef.current && dragNodeIdRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) / zoomRef.current;
      const dy = (e.clientY - dragStartRef.current.y) / zoomRef.current;
      dragDistRef.current += Math.abs(dx) + Math.abs(dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragNodeIdRef.current ? { ...n, x: n.x + dx, y: n.y + dy } : n,
        ),
      );
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
    if (isDraggingNodeRef.current && dragDistRef.current > 5) {
      wasDragRef.current = true;
    }
    isDraggingNodeRef.current = false;
    dragNodeIdRef.current = null;
  }, []);

  /* ── node interactions ── */
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    isDraggingNodeRef.current = true;
    dragNodeIdRef.current = nodeId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragDistRef.current = 0;
    wasDragRef.current = false;
    setSelectedId(nodeId);
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    // Only open detail modal if it wasn't a drag
    if (!wasDragRef.current) {
      setDetailNodeId(nodeId);
    }
    wasDragRef.current = false;
    setSelectedId(nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setEditingId(nodeId);
  }, []);

  /* ── add node ── */
  const addNode = useCallback(
    (parentId: string, direction: 'top' | 'right' | 'bottom' | 'left') => {
      setNodes((prev) => {
        const parent = prev.find((n) => n.id === parentId);
        if (!parent) return prev;

        let nx = parent.x;
        let ny = parent.y;

        switch (direction) {
          case 'right':  nx += GAP_X; break;
          case 'left':   nx -= GAP_X; break;
          case 'bottom': ny += GAP_Y; break;
          case 'top':    ny -= GAP_Y; break;
        }

        const tooClose = (x: number, y: number) =>
          prev.some((n) => Math.abs(n.x - x) < NODE_W + 30 && Math.abs(n.y - y) < NODE_H + 30);

        let tries = 0;
        while (tooClose(nx, ny) && tries < 20) {
          switch (direction) {
            case 'right':  nx += GAP_X; break;
            case 'left':   nx -= GAP_X; break;
            case 'bottom': ny += GAP_Y; break;
            case 'top':    ny -= GAP_Y; break;
          }
          tries++;
        }

        const newId = uid();
        const newNode: MindMapNode = {
          id: newId,
          x: nx,
          y: ny,
          title: '',
          description: '',
          dueDate: '',
          status: 'todo',
          parentId,
        };

        // Open detail modal for new node
        setTimeout(() => {
          setDetailNodeId(newId);
          setSelectedId(newId);
        }, 80);

        return [...prev, newNode];
      });

      setEdges((prev) => prev);
    },
    [],
  );

  // Sync edges when nodes change
  const prevNodesLenRef = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > prevNodesLenRef.current) {
      const edgedNodes = new Set(edges.flatMap((e) => [e.from, e.to]));
      const orphans = nodes.filter((n) => n.parentId && !edgedNodes.has(n.id));
      if (orphans.length > 0) {
        setEdges((prev) => [
          ...prev,
          ...orphans.map((n) => ({
            id: `e_${n.parentId}_${n.id}`,
            from: n.parentId!,
            to: n.id,
          })),
        ]);
      }
    }
    prevNodesLenRef.current = nodes.length;
  }, [nodes, edges]);

  /* ── update node fields ── */
  const handleTitleChange = useCallback((id: string, title: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
  }, []);

  const handleNodeUpdate = useCallback((id: string, updates: Partial<MindMapNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  /* ── delete node + descendants ── */
  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return;
    setNodes((prev) => {
      const getDesc = (id: string): string[] => {
        const kids = prev.filter((n) => n.parentId === id).map((n) => n.id);
        return kids.concat(kids.flatMap(getDesc));
      };
      const del = new Set([nodeId, ...getDesc(nodeId)]);
      return prev.filter((n) => !del.has(n.id));
    });
    setSelectedId(null);
    setEditingId(null);
    setDetailNodeId(null);
  }, []);

  // Clean stale edges
  useEffect(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const stale = edges.filter((e) => !nodeIds.has(e.from) || !nodeIds.has(e.to));
    if (stale.length > 0) {
      setEdges((prev) => prev.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)));
    }
  }, [nodes, edges]);

  /* ── fit to screen ── */
  const fitToScreen = useCallback(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.x)) - 60;
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W)) + 60;
    const minY = Math.min(...nodes.map((n) => n.y)) - 60;
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H)) + 60;

    const cw = maxX - minX;
    const ch = maxY - minY;
    const scaleX = rect.width / cw;
    const scaleY = rect.height / ch;
    const newZoom = Math.min(scaleX, scaleY, 1.5);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - cx * newZoom,
      y: rect.height / 2 - cy * newZoom,
    });
  }, [nodes]);

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId && selectedId !== 'root' && !editingId && !detailNodeId) {
        deleteNode(selectedId);
      }
      if (e.key === 'Escape' && detailNodeId) {
        setDetailNodeId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, editingId, detailNodeId, deleteNode]);

  /* ── cursor style ── */
  const cursorStyle = isPanningRef.current
    ? 'grabbing'
    : isDraggingNodeRef.current
      ? 'grabbing'
      : 'grab';

  const detailNode = detailNodeId ? nodes.find((n) => n.id === detailNodeId) : null;

  /* ────────────────────── Render ────────────────────── */
  return (
    <div
      ref={containerRef}
      className="mindmap-canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: cursorStyle }}
    >
      {/* Dot‑grid background */}
      <div className="mindmap-grid-pattern" />

      {/* Transformed world */}
      <div
        className="mindmap-canvas-world"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG edge layer */}
        <svg className="mindmap-svg-layer" xmlns="http://www.w3.org/2000/svg">
          {edges.map((edge) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <MindMapEdgeComp
                key={edge.id}
                d={bezierPath(from, to)}
                color={statusColor(to.status)}
              />
            );
          })}
        </svg>

        {/* Node layer */}
        {nodes.map((node) => (
          <MindMapNodeCard
            key={node.id}
            node={node}
            isSelected={selectedId === node.id}
            isEditing={editingId === node.id}
            onMouseDown={handleNodeMouseDown}
            onClick={handleNodeClick}
            onDoubleClick={handleNodeDoubleClick}
            onAddNode={addNode}
            onTitleChange={handleTitleChange}
            onEditEnd={() => setEditingId(null)}
            onDelete={deleteNode}
          />
        ))}
      </div>

      {/* ── Canvas Controls ── */}
      <div className="mindmap-controls">
        <button onClick={() => {
          setZoom((prev) => {
            const next = Math.min(3, prev * 1.25);
            const el = containerRef.current;
            if (el) {
              const r = el.getBoundingClientRect();
              const mx = r.width / 2;
              const my = r.height / 2;
              const ratio = next / prev;
              setPan((p: { x: number; y: number }) => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
            }
            return next;
          });
        }} title="Yakınlaştır">
          <ZoomIn size={18} />
        </button>
        <span className="mindmap-zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={() => {
          setZoom((prev) => {
            const next = Math.max(0.15, prev * 0.8);
            const el = containerRef.current;
            if (el) {
              const r = el.getBoundingClientRect();
              const mx = r.width / 2;
              const my = r.height / 2;
              const ratio = next / prev;
              setPan((p: { x: number; y: number }) => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
            }
            return next;
          });
        }} title="Uzaklaştır">
          <ZoomOut size={18} />
        </button>
        <div className="mindmap-controls-sep" />
        <button onClick={fitToScreen} title="Tümünü göster">
          <Maximize2 size={18} />
        </button>
      </div>

      {/* ── Node counter ── */}
      <div className="mindmap-counter">
        {nodes.length} düğüm
      </div>

      {/* ── Hint ── */}
      <div className="mindmap-hint">
        Tıkla: Detay • Sürükle: Taşı • Tekerlek: Zoom • Delete: Sil
      </div>

      {/* ── Task Detail Modal ── */}
      {detailNode && (
        <TaskDetailModal
          node={detailNode}
          onUpdate={handleNodeUpdate}
          onClose={() => setDetailNodeId(null)}
          onDelete={deleteNode}
        />
      )}
    </div>
  );
};
