// WardLayoutViewFull — clinical-density variant of WardLayoutView.
//
// Same room-grouped layout as the lite view PLUS @dnd-kit drag-and-drop bed
// move (port from WardLayoutView). The dense BedTileFull is wrapped in the
// same DraggableBedTile shell, so the decision logic in decideBedMoveAction
// drives both the lite and full views — no behavioural drift.
//
// `BedOccupancyFull extends BedOccupancy` so the existing
// decideBedMoveAction signature accepts our richer occupant rows directly;
// no generic plumbing required.
'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';

import { BedTileFull } from './BedTileFull';
import { decideBedMoveAction, type BedMoveDecision } from './decideBedMoveAction';
import { BedMoveReasonModal } from './BedMoveReasonModal';
import type { BedSlot, BedOccupancyFull } from '@/types/maternity-ward';
import type { ConnectionConfig } from '@/types/bms-browser';
import type { MaternalScreenSummaryItem } from '@/types/api';
import { formatRoomSummary } from '@/config/ward-display';
import { groupBedsByRoom, summarizeBeds } from '@/services/ward-board';

export interface BedMovePayload {
  an: string;
  oldBedno: string;
  oldRoomno: string;
  newBedno: string;
  newRoomno: string;
  reason: string;
}

export interface WardLayoutViewFullProps {
  beds: BedSlot[];
  occupancy: BedOccupancyFull[];
  /** Live "now" tick (ms since epoch) — drives hours-since-admit + severity.
   *  Required so BedTileFull stays render-pure (no internal Date.now()). */
  now: number;
  onBedClick?: (an: string) => void;
  /**
   * Called once the user has confirmed a bed move via the reason modal. The
   * caller (the page) is responsible for invoking the movePatientBed service
   * and revalidating SWR caches.
   */
  onBedMove?: (payload: BedMovePayload) => void;
  /**
   * Resolved list of move-reason strings (from getBedMoveReasons). Passed in
   * by the page so this component stays presentational. Empty array disables
   * the modal Confirm button.
   */
  reasons?: string[];
  /**
   * Called when a drag-end is rejected (locked/occupied/no-op) so the page
   * can surface a Thai-language toast. Defaults to console.warn when unset.
   */
  onMoveRejected?: (reason: 'locked' | 'occupied' | 'no-op') => void;
  /** Active BMS connection — forwarded to each tile to enable patient photos. */
  config?: ConnectionConfig | null;
  marketplaceToken?: string | null;
  /**
   * Cross-source maternal-screen summaries, keyed by AN (Phase 6 Task H4,
   * GC-H4). Looked up HERE (at the layout level, by `occupant.an`) rather
   * than passed whole into DraggableBedTile — that keeps DraggableBedTile's
   * change to a single passthrough prop (a resolved item, not a Map) and
   * keeps BedTileFull's contract simple (one summary object, not a lookup).
   * `undefined`/`null` (fetch not started, or failed) means every tile
   * resolves to `null` — GC-H4 degrade-to-no-chips, never an error tile.
   */
  maternalScreenSummaries?: Map<string, MaternalScreenSummaryItem> | null;
}

// Drag-id encoding — bednos are unique per ward in HOSxP (PK on `bedno`).
function dragId(bed: BedSlot): string {
  return `bed:${bed.bedno}`;
}

interface DraggableBedTileProps {
  bed: BedSlot;
  occupant: BedOccupancyFull | null;
  now: number;
  onBedClick?: (an: string) => void;
  config?: ConnectionConfig | null;
  marketplaceToken?: string | null;
  /** Already resolved by the caller (WardLayoutViewFull) via occupant.an — see maternalScreenSummaries above. */
  maternalScreenSummary?: MaternalScreenSummaryItem | null;
}

// Per-bed wrapper that enrols the tile as both droppable (always) and
// draggable (only when occupied). Empty/locked tiles still need to be
// droppable so a patient can be dropped onto them; locked drops are rejected
// in the dispatcher.
function DraggableBedTile({
  bed,
  occupant,
  now,
  onBedClick,
  config,
  marketplaceToken,
  maternalScreenSummary,
}: DraggableBedTileProps) {
  const id = dragId(bed);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const draggable = useDraggable({
    id,
    disabled: occupant === null,
  });
  // Compose drop ref + drag ref onto the same wrapper.
  const composedRef = (node: HTMLDivElement | null) => {
    setDropRef(node);
    draggable.setNodeRef(node);
  };
  const style: React.CSSProperties | undefined = draggable.transform
    ? {
        transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
      }
    : undefined;
  return (
    <div
      ref={composedRef}
      style={style}
      data-testid={`bed-${bed.bedno}`}
      data-over={isOver ? 'true' : undefined}
      className={isOver ? 'rounded-2xl ring-2 ring-brand ring-offset-2' : undefined}
      {...(occupant ? draggable.listeners : {})}
      {...draggable.attributes}
    >
      <BedTileFull
        bedno={bed.bedno}
        bedLock={bed.bed_lock as 'Y' | 'N' | null}
        occupant={occupant}
        now={now}
        onClick={onBedClick}
        config={config}
        marketplaceToken={marketplaceToken}
        maternalScreenSummary={maternalScreenSummary}
      />
    </div>
  );
}

export function WardLayoutViewFull({
  beds,
  occupancy,
  now,
  onBedClick,
  onBedMove,
  reasons = [],
  onMoveRejected,
  config,
  marketplaceToken,
  maternalScreenSummaries,
}: WardLayoutViewFullProps) {
  const rooms = groupBedsByRoom(beds);
  const occupantByBedno = new Map(occupancy.map((o) => [o.bedno, o] as const));
  const bedByBedno = new Map(beds.map((b) => [b.bedno, b] as const));

  const [pending, setPending] = useState<{
    decision: Extract<BedMoveDecision, { action: 'show-modal' }>;
    sourceBed: BedSlot;
    targetBed: BedSlot;
  } | null>(null);

  // Distance threshold of 6px lets the BedTileFull onClick still fire for
  // simple taps; only sustained pointer movement starts a drag. Keyboard
  // sensor (Tab → Space → Arrow → Space) for accessibility.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    const sourceBedno = String(event.active.id).replace(/^bed:/, '');
    const targetBedno = String(event.over.id).replace(/^bed:/, '');
    const sourceBed = bedByBedno.get(sourceBedno);
    const targetBed = bedByBedno.get(targetBedno);
    if (!sourceBed || !targetBed) return;
    const sourceOccupant = occupantByBedno.get(sourceBedno);
    const targetOccupant = occupantByBedno.get(targetBedno) ?? null;
    if (!sourceOccupant) return;
    const decision = decideBedMoveAction({
      sourceBed,
      sourceOccupant,
      targetBed,
      targetOccupant,
    });
    if (decision.action === 'rejected') {
      if (onMoveRejected) {
        onMoveRejected(decision.reason);
      } else {
        // TODO: replace with a shared toast when the project ships one.
        console.warn(`[bed-move] rejected: ${decision.reason}`);
      }
      return;
    }
    setPending({ decision, sourceBed, targetBed });
  };

  const handleConfirm = (reason: string) => {
    if (!pending) return;
    onBedMove?.({
      an: pending.decision.an,
      oldBedno: pending.sourceBed.bedno,
      oldRoomno: pending.sourceBed.roomno,
      newBedno: pending.targetBed.bedno,
      newRoomno: pending.targetBed.roomno,
      reason,
    });
    setPending(null);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* FHR pulse keyframes — single declaration shared by all tiles. */}
      <style>{`
        @keyframes kk-heartbeat {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.7); opacity: 0.4; }
        }
      `}</style>

      <div className="flex flex-col gap-6">
        {rooms.map((room) => {
          const sum = summarizeBeds(room.beds, occupancy, now);
          const roomTitle = room.room_name ?? `ห้อง ${room.roomno}`;
          return (
            <section key={room.roomno} data-testid={`ward-room-${room.roomno}`} aria-label={roomTitle}>
              <header className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
                <div className="min-w-0">
                  <h2 className="text-title text-brand">{roomTitle}</h2>
                  <p className="text-caption text-ink-muted">รหัสห้อง {room.roomno}</p>
                </div>
                <p className="text-label tabular-nums text-ink-muted">{formatRoomSummary(sum)}</p>
              </header>
              <div data-testid="ward-room-grid" className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                {room.beds.map((b) => {
                  const occupant = occupantByBedno.get(b.bedno) ?? null;
                  return (
                    <DraggableBedTile
                      key={b.bedno}
                      bed={b}
                      occupant={occupant}
                      now={now}
                      onBedClick={onBedClick}
                      config={config}
                      marketplaceToken={marketplaceToken}
                      maternalScreenSummary={
                        occupant ? (maternalScreenSummaries?.get(occupant.an) ?? null) : null
                      }
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {pending && (
        <BedMoveReasonModal
          open
          reasons={reasons}
          fromBedno={pending.sourceBed.bedno}
          toBedno={pending.targetBed.bedno}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </DndContext>
  );
}
