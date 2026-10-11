// tests/unit/components/maternity/ward/ward-header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WardHeaderActions } from '@/components/maternity/ward/WardHeaderActions';
import { WardKpis } from '@/components/maternity/ward/WardKpis';
import type { BedSummary } from '@/services/ward-board';

const one = [{ ward: '03', name: 'ห้องคลอด', real_bedcount: 9 }];
const two = [...one, { ward: '05', name: 'ห้องคลอดสอง', real_bedcount: 2 }];

describe('WardHeaderActions', () => {
  const base = { selectedWard: '03', onSelectWard: vi.fn(), onRefresh: vi.fn() };

  it('hides the ward picker for a single ward; refresh is a named button', () => {
    render(<WardHeaderActions {...base} wards={one} health="ok" />);
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'รีเฟรชข้อมูลเตียง' }));
    expect(base.onRefresh).toHaveBeenCalled();
  });

  it('switches ward through the picker, options read "{name} ({ward})"', () => {
    render(<WardHeaderActions {...base} wards={two} health="ok" />);
    const picker = screen.getByRole('combobox');
    expect(within(picker).getByRole('option', { name: 'ห้องคลอดสอง (05)' })).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: '05' } });
    expect(base.onSelectWard).toHaveBeenCalledWith('05');
  });

  it.each([
    ['ok', 'เชื่อมต่อ HOSxP สด', 'ok'],
    ['reconnecting', 'กำลังเชื่อมต่อ HOSxP ใหม่…', 'warn'],
    ['error', 'ขาดการเชื่อมต่อ HOSxP', 'danger'],
  ] as const)('feed %s → "%s" (%s); the raw error is a tooltip only when unhealthy', (health, label, tone) => {
    render(<WardHeaderActions {...base} wards={one} health={health} errorMessage="BMS unavailable" />);
    const chip = screen.getByRole('status');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveAttribute('data-tone', tone);
    if (health === 'ok') expect(chip).not.toHaveAttribute('title');
    else expect(chip).toHaveAttribute('title', 'BMS unavailable');
  });
});

describe('WardKpis', () => {
  const summary: BedSummary = {
    totalBeds: 9,
    occupied: 4,
    patients: 4,
    unplaced: 0,
    sharedBeds: 0,
    free: 3,
    lockedEmpty: 2,
    lockedOccupied: 0,
    prolongedLatent: 1,
    occupancyPct: 44,
  };

  it('lays the five tiles out 3+2, never a lone tile on its own row', () => {
    render(<WardKpis summary={summary} />);
    const grid = screen.getByTestId('ward-kpi-total').closest('.grid') as HTMLElement;
    expect(grid.className).toContain('grid-cols-3');
    expect(grid.className).not.toContain('grid-cols-4');
  });

  it('is a labelled region with five Thai tiles fed only by the summary', () => {
    render(<WardKpis summary={summary} />);
    const region = screen.getByRole('region', { name: 'สรุปเตียงในห้องคลอด' });
    const tile = (id: string) => within(region).getByTestId(`ward-kpi-${id}`);
    expect(tile('total')).toHaveTextContent('เตียงทั้งหมด');
    expect(tile('total')).toHaveTextContent('9');
    expect(tile('occupied')).toHaveTextContent('มีผู้คลอด');
    expect(tile('occupied')).toHaveTextContent('ใช้เตียง 44%');
    expect(tile('free')).toHaveTextContent('เตียงว่าง');
    expect(tile('locked')).toHaveTextContent('ปิดใช้งาน');
    expect(tile('locked')).toHaveTextContent('ล็อกใน HOSxP');
    expect(tile('prolonged-latent')).toHaveTextContent('ระยะแฝงนาน');
    expect(tile('prolonged-latent')).toHaveTextContent('รับเข้า ≥12 ชม. · ปากมดลูก <4 ซม.');
    expect(tile('prolonged-latent').className).toContain('bg-danger');
    expect(screen.getByRole('button', { name: 'คำอธิบาย: ระยะแฝงนาน' })).toBeInTheDocument();
  });

  it('no prolonged latent → default tone; a patient on a locked bed is called out (B1)', () => {
    render(<WardKpis summary={{ ...summary, prolongedLatent: 0, lockedOccupied: 1 }} />);
    expect(screen.getByTestId('ward-kpi-prolonged-latent').className).not.toContain('bg-danger');
    expect(screen.getByTestId('ward-kpi-locked')).toHaveTextContent('มีผู้คลอดบนเตียงล็อก 1');
  });

  it('I2: "มีผู้คลอด" counts every patient, unplaced included, and names unplaced/shared beds', () => {
    render(<WardKpis summary={{ ...summary, patients: 6, unplaced: 1, sharedBeds: 1 }} />);
    const tile = screen.getByTestId('ward-kpi-occupied');
    expect(tile.querySelector('[data-kpi-value]')).toHaveTextContent(/^0?6$/);
    expect(tile).toHaveTextContent('ใช้เตียง 44%');
    expect(tile).toHaveTextContent('ยังไม่ได้จัดเตียง 1');
    expect(tile).toHaveTextContent('เตียงซ้อน 1');
  });

  it('an empty ward shows no occupancy percentage', () => {
    render(<WardKpis summary={{ ...summary, totalBeds: 0, occupied: 0, occupancyPct: null }} />);
    expect(screen.getByTestId('ward-kpi-occupied')).not.toHaveTextContent('%');
  });
});
