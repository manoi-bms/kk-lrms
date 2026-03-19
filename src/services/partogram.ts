// T067: Partogram service — alert/action line calculations
import type { PartogramEntry } from '@/types/api';

interface AlertLinePoint {
  measuredAt: string;
  dilationCm: number;
}

/**
 * Calculate alert line starting at given dilation (default 4cm)
 * progressing at 1cm/hour up to 10cm.
 */
export function calculateAlertLine(
  startTime: Date,
  startDilation: number = 4,
): AlertLinePoint[] {
  const points: AlertLinePoint[] = [];
  for (let cm = startDilation; cm <= 10; cm++) {
    const hoursFromStart = cm - startDilation;
    const time = new Date(startTime.getTime() + hoursFromStart * 3600000);
    points.push({
      measuredAt: time.toISOString(),
      dilationCm: cm,
    });
  }
  return points;
}

/**
 * Calculate action line — same dilation values as alert line
 * but offset 4 hours to the right.
 */
export function calculateActionLine(alertLineEntries: AlertLinePoint[]): AlertLinePoint[] {
  return alertLineEntries.map((entry) => ({
    measuredAt: new Date(new Date(entry.measuredAt).getTime() + 4 * 3600000).toISOString(),
    dilationCm: entry.dilationCm,
  }));
}

interface VitalSignInput {
  measuredAt: string;
  cervixCm: number;
}

/**
 * Generate partogram entries from vital signs data.
 * Alert/action lines start computing once dilation reaches 4cm.
 */
export function generatePartogramEntries(
  vitalSigns: VitalSignInput[],
): PartogramEntry[] {
  if (vitalSigns.length === 0) return [];

  // Find when active phase starts (first measurement at >= 4cm)
  const activePhaseIndex = vitalSigns.findIndex((vs) => vs.cervixCm >= 4);

  let alertLine: AlertLinePoint[] = [];
  let actionLine: AlertLinePoint[] = [];

  if (activePhaseIndex >= 0) {
    const activePhaseStart = new Date(vitalSigns[activePhaseIndex].measuredAt);
    const startDilation = vitalSigns[activePhaseIndex].cervixCm;
    alertLine = calculateAlertLine(activePhaseStart, startDilation);
    actionLine = calculateActionLine(alertLine);
  }

  return vitalSigns.map((vs) => {
    const vsTime = new Date(vs.measuredAt).getTime();
    let alertLineCm: number | null = null;
    let actionLineCm: number | null = null;

    if (activePhaseIndex >= 0 && vs.cervixCm >= 4) {
      // Interpolate alert line value at this time
      alertLineCm = interpolateLineValue(alertLine, vsTime);
      actionLineCm = interpolateLineValue(actionLine, vsTime);
    }

    return {
      measuredAt: vs.measuredAt,
      dilationCm: vs.cervixCm,
      alertLineCm,
      actionLineCm,
    };
  });
}

/**
 * Interpolate dilation value on a reference line at a given time.
 * Uses linear interpolation between the two nearest points.
 */
function interpolateLineValue(
  line: AlertLinePoint[],
  targetTime: number,
): number | null {
  if (line.length === 0) return null;

  const firstTime = new Date(line[0].measuredAt).getTime();
  const lastTime = new Date(line[line.length - 1].measuredAt).getTime();

  // Before the line starts
  if (targetTime <= firstTime) return line[0].dilationCm;
  // After the line ends
  if (targetTime >= lastTime) return line[line.length - 1].dilationCm;

  // Find surrounding points
  for (let i = 0; i < line.length - 1; i++) {
    const t1 = new Date(line[i].measuredAt).getTime();
    const t2 = new Date(line[i + 1].measuredAt).getTime();
    if (targetTime >= t1 && targetTime <= t2) {
      const ratio = (targetTime - t1) / (t2 - t1);
      return line[i].dilationCm + ratio * (line[i + 1].dilationCm - line[i].dilationCm);
    }
  }

  return null;
}
