import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { RiskLevel } from '@/types/domain';

type Row = { an: string; name: string; score: number; risk: RiskLevel };
const rows: Row[] = [
  { an: 'AN1', name: 'นาง ส.', score: 11.5, risk: RiskLevel.HIGH },
  { an: 'AN2', name: 'นาง ก.', score: 2.5, risk: RiskLevel.LOW },
];
const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'ผู้คลอด', cell: (r) => r.name },
  { key: 'score', header: 'คะแนน', cell: (r) => r.score.toFixed(1), numeric: true },
];

describe('DataTable', () => {
  it('renders headers and rows, numeric cells right-aligned with tabular figures', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.an} caption="ผู้คลอด" />);
    expect(screen.getByRole('table', { name: 'ผู้คลอด' })).toBeInTheDocument();
    const cell = screen.getByText('11.5').closest('td')!;
    expect(cell.className).toContain('text-right');
    expect(cell.className).toContain('tabular-nums');
  });
  it('tints rows by risk', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.an} rowRisk={(r) => r.risk} />);
    expect(screen.getByText('นาง ส.').closest('tr')!.className).toContain('bg-danger-tint');
    expect(screen.getByText('นาง ก.').closest('tr')!.className).toContain('bg-ok-tint');
  });
  it('loading shows a busy skeleton, not the empty message', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.an} loading />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('ไม่มีข้อมูล')).not.toBeInTheDocument();
  });
  it('empty rows render the empty slot across all columns', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.an} empty={<span>ยังไม่มีผู้คลอด</span>} />);
    const cell = screen.getByText('ยังไม่มีผู้คลอด').closest('td')!;
    expect(cell).toHaveAttribute('colspan', '2');
  });
  it('clickable rows respond to click and Enter', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.an} onRowClick={onRowClick} />);
    const tr = screen.getByText('นาง ก.').closest('tr')!;
    await userEvent.click(tr);
    tr.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    expect(within(tr).getByText('2.5')).toBeInTheDocument();
  });
});
