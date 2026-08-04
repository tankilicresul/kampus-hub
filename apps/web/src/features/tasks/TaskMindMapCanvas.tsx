import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Plus, ZoomIn, ZoomOut, Maximize2, Trash2, X } from 'lucide-react';

/* ────────────────────── Types ────────────────────── */
interface MindMapNode {
  id: string;
  x: number;
  y: number;
  title: string;
  color: string;
  parentId: string | null;
}

interface MindMapEdge {
  id: string;
  from: string;
  to: string;
}

/* ────────────────────── Constants ────────────────────── */
const NODE_W = 170;
const NODE_H = 100;
const GAP_X = 260;
const GAP_Y = 200;

const PALETTE = [
  '#ff9f0a', '#6366f1', '#06b6d4', '#22c55e',
  '#f43f5e', '#a855f7', '#ec4899', '#14b8a6',
  '#f97316', '#8b5cf6', '#0ea5e9', '#84cc16',
];

/* ────────────────────── Helpers ────────────────────── */
const uid = () => `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Cubic‑Bézier path from source‑node edge → target‑node edge.
 * Direction‑aware: exits through the nearest side.
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
    // horizontal‑dominant
    if (dx >= 0) {
      sx = from.x + NODE_W; sy = fcy;
      ex = to.x;             ey = tcy;
    } else {
      sx = from.x;           sy = fcy;
      ex = to.x + NODE_W;    ey = tcy;
    }
    const cp = Math.max(Math.abs(dx) * 0.45, 40);
    return `M${sx},${sy} C${sx + Math.sign(dx) * cp},${sy} ${ex - Math.sign(dx) * cp},${ey} ${ex},${ey}`;
  } else {
    // vertical‑dominant
    if (dy >= 0) {
      sx = fcx; sy = from.y + NODE_H;
      ex = tcx; ey = to.y;
    } else {
      sx = fcx; sy = from.y;
      ex = tcx; ey = to.y + NODE_H;
    }
    const cp = Math.max(Math.abs(dy) * 0.45, 40);
    return `M${sx},${sy} C${sx},${sy + Math.sign(dy) * cp} ${ex},${ey - Math.sign(dy) * cp} ${ex},${ey}`;
  }
};

/* ────────────────────── Edge Component ────────────────────── */
const MindMapEdge = memo(({ d }: { d: string }) => (
  <g>
    <path d={d} className="mindmap-edge-path" />
    <circle r="4" className="mindmap-flow-dot">
      <animateMotion dur="2.8s" repeatCount="indefinite" path={d} />
    </circle>
  </g>
));
MindMapEdge.displayName = 'MindMapEdge';

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
        '--node-color': node.color,
      } as React.CSSProperties}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onClick={(e) => onClick(e, node.id)}
      onDoubleClick={(e) => onDoubleClick(e, node.id)}
    >
      {/* Color bar top */}
      <div className="mindmap-node-color-bar" style={{ background: node.color }} />

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
          <span className={`mindmap-node-title${!node.title ? ' placeholder' : ''}`}>
            {node.title || 'Çift tıkla...'}
          </span>
        )}
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

/* ────────────────────── Main Canvas ────────────────────── */
export const TaskMindMapCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── state ── */
  const [nodes, setNodes] = useState<MindMapNode[]>([
    { id: 'root', x: 0, y: 0, title: 'Merkez Görev', color: '#ff9f0a', parentId: null },
  ]);
  const [edges, setEdges] = useState<MindMapEdge[]>([]);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  /* ── center on mount ── */
  useEffect(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setPan({ x: r.width / 2 - NODE_W / 2, y: r.height / 2 - NODE_H / 2 });
    }
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
        setPan((p) => ({
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
    // Only start canvas pan if clicking on canvas background
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
    isDraggingNodeRef.current = false;
    dragNodeIdRef.current = null;
  }, []);

  /* ── node interactions ── */
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    isDraggingNodeRef.current = true;
    dragNodeIdRef.current = nodeId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setSelectedId(nodeId);
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
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

        // collision avoidance — push further in the same direction
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
          color: PALETTE[prev.length % PALETTE.length],
          parentId,
        };

        // schedule editing after render
        setTimeout(() => {
          setEditingId(newId);
          setSelectedId(newId);
        }, 50);

        return [...prev, newNode];
      });

      setEdges((prev) => {
        // we need the new id — reconstruct it (not ideal, but functional)
        // Instead, let's compute it in a single setNodes + setEdges call
        return prev;
      });

      // We'll handle edge creation via an effect
    },
    [],
  );

  // Sync edges when nodes change (simpler than coordinating two setState calls)
  const prevNodesLenRef = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > prevNodesLenRef.current) {
      // New node(s) added — find nodes without edges
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

  /* ── title change ── */
  const handleTitleChange = useCallback((id: string, title: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
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
    setEdges((prev) => {
      // Remove edges referencing deleted nodes
      return prev; // will be cleaned in next effect cycle
    });
    setSelectedId(null);
    setEditingId(null);
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
      if (e.key === 'Delete' && selectedId && selectedId !== 'root' && !editingId) {
        deleteNode(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, editingId, deleteNode]);

  /* ── cursor style ── */
  const cursorStyle = isPanningRef.current
    ? 'grabbing'
    : isDraggingNodeRef.current
      ? 'grabbing'
      : 'grab';

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
      {/* Dot‑grid background (stays fixed relative to container) */}
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
            return <MindMapEdge key={edge.id} d={bezierPath(from, to)} />;
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
              setPan((p) => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
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
              setPan((p) => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
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
        Tekerlek: Zoom • Sürükle: Hareket • Çift tıkla: Düzenle • Delete: Sil
      </div>
    </div>
  );
};
