import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapStatusLegend } from '@/components/dashboard/MapStatusLegend';

describe('MapStatusLegend', () => {
  it('light mode is Thai', () => {
    render(<MapStatusLegend mode="light" />);
    const legend = screen.getByLabelText('คำอธิบายสีจุดสถานะบนแผนที่');
    expect(legend).toHaveTextContent('สถานะการเชื่อมต่อ');
    expect(legend).toHaveTextContent('ออนไลน์');
    expect(legend).toHaveTextContent('ระงับการซิงค์');
    expect(legend).not.toHaveTextContent('ONLINE');
  });
  it('kiosk mode keeps its English legend', () => {
    render(<MapStatusLegend mode="kiosk" />);
    const legend = screen.getByLabelText('Map dot color legend');
    expect(legend).toHaveTextContent('STATUS DOT');
    expect(legend).toHaveTextContent('ONLINE');
    expect(legend).toHaveTextContent('ยังไม่ sync');
  });
});
