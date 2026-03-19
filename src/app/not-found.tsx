// T098: Custom 404 page
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">ไม่พบหน้าที่ต้องการ</h2>
        <p className="text-muted-foreground">
          หน้าที่คุณเข้าถึงไม่มีอยู่ในระบบ
        </p>
        <Link href="/">
          <Button variant="outline">กลับหน้าหลัก</Button>
        </Link>
      </div>
    </div>
  );
}
