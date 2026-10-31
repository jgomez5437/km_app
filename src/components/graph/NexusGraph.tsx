"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Note, Folder, GraphNode, GraphLink } from "@/types/vault";
import { ZoomIn, ZoomOut, RotateCcw, Filter, Eye } from "lucide-react";

interface NexusGraphProps {
  notes: Note[];
  folders?: Folder[];
  activeNoteId?: string;
  onSelectNote: (noteId: string) => void;
}

export const NexusGraph: React.FC<NexusGraphProps> = ({
  notes,
  folders = [],
  activeNoteId,
  onSelectNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const [showLabels, setShowLabels] = useState(true);

  // Build nodes and links from folders, notes, and subpages
  const { nodes, links } = useMemo(() => {
    const linkList: GraphLink[] = [];
    const nodeList: (GraphNode & {
      radius: number;
      nodeType: "folder" | "note" | "subpage";
      color: string;
    })[] = [];

    // 1. Folder Nodes
    folders.forEach((folder) => {
      nodeList.push({
        id: `folder-${folder.id}`,
        title: folder.name,
        val: 10,
        group: "folder",
        nodeType: "folder",
        radius: 17,
        color: "#a855f7", // Vibrant Purple
      });
    });

    // 2. Note & Subpage Nodes
    notes.forEach((note) => {
      const isSubpage = Boolean(note.parentId);
      nodeList.push({
        id: note.id,
        title: note.title,
        val: isSubpage ? 4 : 7,
        group: isSubpage ? "subpage" : "note",
        nodeType: isSubpage ? "subpage" : "note",
        radius: isSubpage ? 8 : 12,
        color: isSubpage ? "#34d399" : "#38bdf8", // Emerald for subpages, Sky Blue for notes
      });

      // Links: Folder -> Note
      if (note.folderId && !note.parentId) {
        linkList.push({
          source: `folder-${note.folderId}`,
          target: note.id,
        });
      }

      // Links: Parent Note -> Subpage
      if (note.parentId) {
        linkList.push({
          source: note.parentId,
          target: note.id,
        });
      }
    });

    return { nodes: nodeList, links: linkList };
  }, [notes, folders]);

  // Position nodes with physics force simulation
  const simulationRef = useRef<{
    positions: Map<string, { x: number; y: number; vx: number; vy: number }>;
  }>({
    positions: new Map(),
  });

  // Initialize or update positions
  useEffect(() => {
    const positions = simulationRef.current.positions;
    const count = nodes.length;
    nodes.forEach((node, i) => {
      if (!positions.has(node.id)) {
        const angle = (i / count) * 2 * Math.PI;
        const pseudoRand = ((i * 9301 + 49297) % 233280) / 233280;
        const radius = 100 + pseudoRand * 140;
        positions.set(node.id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        });
      }
    });
  }, [nodes]);

  // Physics animation tick
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let iterations = 0;
    const maxIterations = 280;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const positions = simulationRef.current.positions;

      // Force simulation step
      if (iterations < maxIterations) {
        iterations++;
        // Repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const p1 = positions.get(n1.id);
            const p2 = positions.get(n2.id);
            if (!p1 || !p2) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 380 / (dist * dist);

            p1.vx -= (dx / dist) * force;
            p1.vy -= (dy / dist) * force;
            p2.vx += (dx / dist) * force;
            p2.vy += (dy / dist) * force;
          }
        }

        // Attraction along links
        for (const link of links) {
          const p1 = positions.get(link.source);
          const p2 = positions.get(link.target);
          if (!p1 || !p2) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 80;
          const springForce = (dist - desiredDist) * 0.04;

          p1.vx += (dx / dist) * springForce;
          p1.vy += (dy / dist) * springForce;
          p2.vx -= (dx / dist) * springForce;
          p2.vy -= (dy / dist) * springForce;
        }

        // Gravity pull to origin and velocity damping
        nodes.forEach((node) => {
          const p = positions.get(node.id);
          if (!p) return;
          p.vx -= p.x * 0.005;
          p.vy -= p.y * 0.005;
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.x += p.vx;
          p.y += p.vy;
        });
      }

      // Draw Graph
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // Determine active highlight set
      const highlightId = hoveredNode || activeNoteId;
      const neighbors = new Set<string>();
      if (highlightId) {
        neighbors.add(highlightId);
        links.forEach((l) => {
          if (l.source === highlightId) neighbors.add(l.target);
          if (l.target === highlightId) neighbors.add(l.source);
        });
      }

      // Draw Edges
      links.forEach((link) => {
        const p1 = positions.get(link.source);
        const p2 = positions.get(link.target);
        if (!p1 || !p2) return;

        const isHighlighted =
          highlightId &&
          (link.source === highlightId || link.target === highlightId);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (isHighlighted) {
          ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
          ctx.lineWidth = 2;
        } else if (highlightId) {
          ctx.strokeStyle = "rgba(75, 85, 99, 0.15)";
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = "rgba(156, 163, 175, 0.25)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const p = positions.get(node.id);
        if (!p) return;

        const isFiltered =
          searchFilter.trim() !== "" &&
          !node.title.toLowerCase().includes(searchFilter.toLowerCase());

        const isActive = node.id === activeNoteId;
        const isHovered = node.id === hoveredNode;
        const isNeighbor = neighbors.has(node.id);

        let alpha = 1;
        if (isFiltered) alpha = 0.15;
        else if (highlightId && !isNeighbor) alpha = 0.25;

        ctx.globalAlpha = alpha;

        // Outer glow for active or hovered
        if (isActive || isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = isActive
            ? "rgba(168, 85, 247, 0.3)"
            : "rgba(56, 189, 248, 0.3)";
          ctx.fill();
        }

        // Node Body
        ctx.beginPath();
        ctx.arc(p.x, p.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isActive ? "#c084fc" : node.color;
        ctx.fill();

        // Node Border
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isActive ? "#ffffff" : "rgba(255, 255, 255, 0.35)";
        ctx.stroke();

        // Labels
        if (showLabels && (showLabels || isActive || isHovered || isNeighbor)) {
          ctx.font = `${isActive || isHovered ? "bold " : ""}${
            node.nodeType === "folder" ? "12px" : "11px"
          } Inter, sans-serif`;
          ctx.fillStyle =
            isActive || isHovered
              ? "#ffffff"
              : "rgba(226, 232, 240, 0.85)";
          ctx.textAlign = "center";
          ctx.fillText(node.title, p.x, p.y + node.radius + 14);
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, links, hoveredNode, activeNoteId, zoom, pan, searchFilter, showLabels]);

  // Mouse interactions for canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const graphX = (mouseX - width / 2 - pan.x) / zoom;
    const graphY = (mouseY - height / 2 - pan.y) / zoom;

    const positions = simulationRef.current.positions;
    let foundNode: string | null = null;

    for (const node of nodes) {
      const p = positions.get(node.id);
      if (p) {
        const dx = p.x - graphX;
        const dy = p.y - graphY;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
          foundNode = node.id;
          break;
        }
      }
    }

    setHoveredNode(foundNode);
    canvas.style.cursor = foundNode ? "pointer" : isDragging ? "grabbing" : "grab";
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredNode && !hoveredNode.startsWith("folder-")) {
      onSelectNote(hoveredNode);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.max(0.2, Math.min(3.5, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full bg-[#0d1117] overflow-hidden flex flex-col select-none">
      {/* Top Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#161b22]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-800 text-xs shadow-lg">
        <Filter className="w-3.5 h-3.5 text-purple-400" />
        <input
          type="text"
          placeholder="Filter nodes..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="bg-transparent border-none text-gray-200 focus:outline-none placeholder-gray-500 w-32 text-xs"
        />
        {searchFilter && (
          <button
            onClick={() => setSearchFilter("")}
            className="text-gray-400 hover:text-white text-[10px]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Floating View Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#161b22]/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-800 shadow-lg">
        <button
          onClick={() => setShowLabels(!showLabels)}
          title="Toggle Labels"
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            showLabels ? "text-purple-400" : "text-gray-400"
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-gray-800 text-gray-300 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-gray-800 text-gray-300 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset Graph Position"
          className="p-1.5 rounded hover:bg-gray-800 text-gray-300 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Status Indicator */}
      <div className="absolute bottom-3 left-3 z-10 text-[11px] text-gray-400 bg-[#161b22]/80 backdrop-blur-md px-2.5 py-1 rounded border border-gray-800 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        <span>
          {folders.length} Folders · {notes.length} Notes & Subpages
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
