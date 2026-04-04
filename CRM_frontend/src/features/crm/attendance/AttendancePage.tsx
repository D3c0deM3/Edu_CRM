import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ClipboardCheck, MoveHorizontal, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RootState } from '../../../store';
import { useAppSelector } from '../hooks/useAppSelector';
import TeacherAttendanceTab from '../../teacher/components/TeacherAttendanceTab';
import AttendancePageOld from './AttendancePageOld';

type TeacherAttendanceMode = 'qr' | 'manual';

const AttendancePage = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const isTeacher = user?.userType === 'teacher';

  const [teacherMode, setTeacherMode] = useState<TeacherAttendanceMode>('qr');
  const [isDragging, setIsDragging] = useState(false);

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const qrPanelRef = useRef<HTMLDivElement | null>(null);
  const manualPanelRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  const scrollToTeacherPanel = (mode: TeacherAttendanceMode) => {
    const container = carouselRef.current;
    const target = mode === 'qr' ? qrPanelRef.current : manualPanelRef.current;

    if (!container || !target) {
      setTeacherMode(mode);
      return;
    }

    container.scrollTo({
      left: target.offsetLeft,
      behavior: 'smooth',
    });
    setTeacherMode(mode);
  };

  useEffect(() => {
    if (!isTeacher) {
      return;
    }

    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const updateModeFromScroll = () => {
      const midpoint = container.scrollLeft + container.clientWidth / 2;
      const manualLeft = manualPanelRef.current?.offsetLeft ?? container.clientWidth;
      setTeacherMode(midpoint >= manualLeft ? 'manual' : 'qr');
    };

    updateModeFromScroll();
    container.addEventListener('scroll', updateModeFromScroll, { passive: true });

    return () => container.removeEventListener('scroll', updateModeFromScroll);
  }, [isTeacher]);

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = container.scrollLeft;
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const container = carouselRef.current;
    if (!container || !isDraggingRef.current) {
      return;
    }

    const delta = event.clientX - dragStartXRef.current;
    container.scrollLeft = dragStartScrollRef.current - delta;
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  if (!isTeacher) {
    return <AttendancePageOld />;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-card to-muted/40 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">Attendance Workspace</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                Pick the mode that fits the moment. Swipe or drag between QR attendance and manual
                attendance, or tap the cards to jump straight in.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
              <MoveHorizontal className="h-4 w-4" />
              Drag sideways to switch
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => scrollToTeacherPanel('qr')}
              className="text-left"
            >
              <Card
                className={cn(
                  'h-full border-2 bg-card/90 text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  teacherMode === 'qr'
                    ? 'border-indigo-500 ring-4 ring-indigo-500/10'
                    : 'border-border/80'
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      teacherMode === 'qr'
                        ? 'bg-indigo-500/15 text-indigo-500'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">QR Attendance</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Fast check-in
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Generate a live QR code on the spot and let students mark themselves present
                      as they scan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => scrollToTeacherPanel('manual')}
              className="text-left"
            >
              <Card
                className={cn(
                  'h-full border-2 bg-card/90 text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  teacherMode === 'manual'
                    ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                    : 'border-border/80'
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      teacherMode === 'manual'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">Manual Attendance</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Full control
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Choose one of your classes, then mark each student present or absent directly
                      in the table.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 lg:p-6 lg:pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  teacherMode === 'qr' ? 'bg-indigo-500' : 'bg-muted'
                )}
              />
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  teacherMode === 'manual' ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={teacherMode === 'qr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => scrollToTeacherPanel('qr')}
              >
                QR
              </Button>
              <Button
                type="button"
                variant={teacherMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => scrollToTeacherPanel('manual')}
              >
                Manual
              </Button>
            </div>
          </div>

          <div
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            className={cn(
              'flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth rounded-[28px]',
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            )}
          >
            <section ref={qrPanelRef} className="min-w-full snap-start">
              <div className="rounded-[28px] border border-border bg-card/80 p-4 shadow-sm lg:p-6">
                <TeacherAttendanceTab teacherId={user?.id} showManualSection={false} />
              </div>
            </section>

            <section ref={manualPanelRef} className="min-w-full snap-start">
              <div className="rounded-[28px] border border-border bg-card/80 p-4 shadow-sm lg:p-6">
                <TeacherAttendanceTab
                  teacherId={user?.id}
                  showQrSection={false}
                  manualMode="quick"
                />
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
