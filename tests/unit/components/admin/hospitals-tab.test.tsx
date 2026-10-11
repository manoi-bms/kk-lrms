// tests/unit/components/admin/hospitals-tab.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HospitalsTab } from '@/components/admin/HospitalsTab';
import { adminHospital, renderWithSwr, stubMutations } from '../../../helpers/admin-fixtures';

const failing = adminHospital({
  hcode: '10671', name: 'รพ.ชุมแพ',
  bmsConfig: { tunnelUrl: 'https://t', hasSession: false, sessionExpiresAt: null, databaseType: null,
    authenticity: { status: 'cid_unstable', checkedAt: null, reason: null } },
});
const BASE = {
  '/api/admin/hospitals': { hospitals: [adminHospital(), failing] },
  '/api/admin/config': { config: { active_province_code: '40' } },
  '/api/admin/provinces': { provinces: [{ code: '40', name: 'ขอนแก่น' }] },
  '/api/admin/hospitals/data-counts': { counts: { '10670': { totalRows: 1234, perTable: { cached_patients: 1234 } } } },
  '/api/admin/moph-hospitals?province=40': {
    hospitals: [{ hcode: '10999', name: 'รพ.ใหม่', hospitalTypeId: 7, bedCount: 30, provinceCode: '40', districtCode: '4002' }],
  },
};
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('HospitalsTab — characterization (must not change)', () => {
  it('adds a hospital from the MOPH registry with a JSON POST', async () => {
    const fetchSpy = stubMutations();
    renderWithSwr(<HospitalsTab />, BASE);
    await userEvent.click(await screen.findByRole('button', { name: /เพิ่มโรงพยาบาล/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getAllByRole('combobox')[0], '10999');
    await userEvent.click(within(dialog).getByRole('button', { name: /^เพิ่ม$/ }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/admin/hospitals');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(init!.body))).toMatchObject({ hcode: '10999', name: 'รพ.ใหม่', provinceCode: '40', districtCode: '4002', isActive: true });
  });
  it('deletes only after confirm(), with DELETE to the hospital URL', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const fetchSpy = stubMutations();
    renderWithSwr(<HospitalsTab />, BASE);
    const del = (await screen.findAllByRole('button', { name: /^ลบ/ }))[0];
    await userEvent.click(del);
    expect(fetchSpy).not.toHaveBeenCalled();
    await userEvent.click(del);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/admin/hospitals/10670', { method: 'DELETE' }));
    expect(confirmSpy).toHaveBeenNthCalledWith(1, 'ลบ รพ.ขอนแก่น (10670)?\nข้อมูลการตั้งค่า BMS จะถูกลบไปด้วย');
  });
  it('clear-purge needs confirm() and POSTs to clear-purge', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchSpy = stubMutations();
    renderWithSwr(<HospitalsTab />, BASE);
    await userEvent.click(await screen.findByRole('button', { name: /เปิดใช้งาน.*อีกครั้ง/ }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/admin/hospitals/10671/clear-purge', { method: 'POST' }));
  });
});
