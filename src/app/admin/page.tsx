// T096: Admin page — hospital BMS config management
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import { LoadingState } from '@/components/shared/LoadingState';
import { ConnectionStatus as ConnectionStatusEnum } from '@/types/domain';

interface AdminHospital {
  hcode: string;
  name: string;
  level: string;
  isActive: boolean;
  connectionStatus: string;
  lastSyncAt: string | null;
  bmsConfig: {
    tunnelUrl: string;
    hasSession: boolean;
    sessionExpiresAt: string | null;
    databaseType: string | null;
  } | null;
}

interface TestResult {
  connected: boolean;
  databaseType?: string;
  databaseVersion?: string;
  tablesFound?: string[];
  error?: string;
}

export default function AdminPage() {
  const { data, isLoading, mutate } = useSWR<{ hospitals: AdminHospital[] }>('/api/admin/hospitals');
  const [editHospital, setEditHospital] = useState<AdminHospital | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState message="กำลังโหลดข้อมูลโรงพยาบาล..." />;
  }

  const hospitals = data?.hospitals ?? [];

  const handleEdit = (hospital: AdminHospital) => {
    setEditHospital(hospital);
    setTunnelUrl(hospital.bmsConfig?.tunnelUrl ?? '');
    setTestResult(null);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!editHospital || !tunnelUrl.trim()) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/hospitals/${editHospital.hcode}/bms-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tunnelUrl: tunnelUrl.trim() }),
      });

      const result = await res.json();

      if (res.ok) {
        setSaveMessage(result.sessionValidated
          ? `บันทึกสำเร็จ — Session validated, DB: ${result.databaseType}`
          : 'บันทึก URL แล้ว — ยังไม่สามารถ validate session ได้'
        );
        mutate();
      } else {
        setSaveMessage(`ผิดพลาด: ${result.error}`);
      }
    } catch {
      setSaveMessage('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!editHospital) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/admin/hospitals/${editHospital.hcode}/test-connection`, {
        method: 'POST',
      });

      const result = await res.json();
      setTestResult(result);
    } catch {
      setTestResult({ connected: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold">จัดการโรงพยาบาล</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>HCODE</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ระดับ</TableHead>
              <TableHead>Tunnel URL</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>DB Type</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hospitals.map((h) => (
              <TableRow key={h.hcode}>
                <TableCell className="font-mono">{h.hcode}</TableCell>
                <TableCell>{h.name}</TableCell>
                <TableCell><Badge variant="outline">{h.level}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">
                  {h.bmsConfig?.tunnelUrl ?? <span className="text-muted-foreground">ยังไม่ตั้งค่า</span>}
                </TableCell>
                <TableCell>
                  <ConnectionStatus
                    status={h.connectionStatus as ConnectionStatusEnum}
                    lastSyncAt={h.lastSyncAt}
                  />
                </TableCell>
                <TableCell>
                  {h.bmsConfig?.hasSession ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">None</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {h.bmsConfig?.databaseType ?? '-'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(h)}>
                    แก้ไข
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editHospital} onOpenChange={(open) => !open && setEditHospital(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              แก้ไข BMS Config — {editHospital?.name} ({editHospital?.hcode})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tunnelUrl" className="text-sm font-medium">Tunnel URL</label>
              <Input
                id="tunnelUrl"
                value={tunnelUrl}
                onChange={(e) => setTunnelUrl(e.target.value)}
                placeholder="https://xxxxx-ondemand-win-xxxxxxxxx.tunnel.hosxp.net"
              />
            </div>

            {saveMessage && (
              <div className={`rounded-md p-3 text-sm ${saveMessage.includes('สำเร็จ') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMessage}
              </div>
            )}

            {testResult && (
              <div className={`rounded-md p-3 text-sm ${testResult.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {testResult.connected ? (
                  <div className="space-y-1">
                    <div>เชื่อมต่อสำเร็จ</div>
                    <div>Database: {testResult.databaseType} — {testResult.databaseVersion}</div>
                    <div>Tables: {testResult.tablesFound?.join(', ') ?? 'none'}</div>
                  </div>
                ) : (
                  <div>เชื่อมต่อไม่สำเร็จ: {testResult.error}</div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !tunnelUrl.trim()}>
              {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !tunnelUrl.trim()}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
