import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Statistics = () => {
  const navigate = useNavigate();

  // Fetch all students
  const { data: students = [] } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('*');
      return data || [];
    }
  });

  // Fetch all attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['all-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('attendance_records').select('*');
      return data || [];
    }
  });

  // Fetch all absence records
  const { data: absenceRecords = [] } = useQuery({
    queryKey: ['all-absences'],
    queryFn: async () => {
      const { data } = await supabase.from('absence_records').select('*');
      return data || [];
    }
  });

  // Calculate overall statistics
  const totalAttendance = attendanceRecords.filter((r: any) => r.check_in_time).length;
  const totalAbsences = absenceRecords.length;
  const total = totalAttendance + totalAbsences;
  
  const attendanceRate = total > 0 ? Math.round((totalAttendance / total) * 100) : 0;
  const absenceRate = total > 0 ? Math.round((totalAbsences / total) * 100) : 0;

  // Get today's date
  const today = new Date().toLocaleDateString('ar-DZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((r: any) => 
    r.date === todayStr && r.check_in_time
  ).length;
  const todayAbsences = absenceRecords.filter((r: any) => 
    r.created_at?.startsWith(todayStr)
  ).length;

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/main')}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <h1 className="text-lg font-bold text-foreground">الإحصائيات</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container py-6 space-y-6">
        
        {/* Today's Date */}
        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{today}</span>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Attendance Card */}
          <Card className="glass-card bg-success/10 border-success/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                إجمالي الحضور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-success">{totalAttendance}</span>
                <span className="text-lg font-medium text-success/80">({attendanceRate}%)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                من إجمالي {total} سجل
              </p>
            </CardContent>
          </Card>

          {/* Total Absence Card */}
          <Card className="glass-card bg-destructive/10 border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                إجمالي الغياب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-destructive">{totalAbsences}</span>
                <span className="text-lg font-medium text-destructive/80">({absenceRate}%)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                من إجمالي {total} سجل
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Stats */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-primary" />
              إحصائيات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-success/5 rounded-xl border border-success/20">
                <div className="text-3xl font-bold text-success">{todayAttendance}</div>
                <div className="text-sm text-muted-foreground mt-1">حضور اليوم</div>
              </div>
              <div className="text-center p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                <div className="text-3xl font-bold text-destructive">{todayAbsences}</div>
                <div className="text-sm text-muted-foreground mt-1">غياب اليوم</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              نظرة عامة على التلاميذ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6">
              <div className="text-5xl font-bold text-primary">{students.length}</div>
              <div className="text-muted-foreground mt-2">إجمالي عدد التلاميذ المسجلين</div>
            </div>
            
            {/* Progress bar showing attendance rate */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">نسبة الحضور الإجمالية</span>
                <span className={`font-bold ${
                  attendanceRate >= 80 ? 'text-success' :
                  attendanceRate >= 60 ? 'text-yellow-600' :
                  'text-destructive'
                }`}>{attendanceRate}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    attendanceRate >= 80 ? 'bg-success' :
                    attendanceRate >= 60 ? 'bg-yellow-500' :
                    'bg-destructive'
                  }`}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Info */}
        <div className="glass-card p-3 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-medium">طريقة الحساب:</span> نسبة الحضور = الحضور ÷ (الحضور + الغياب) × 100
          </p>
        </div>
      </main>
    </div>
  );
};

export default Statistics;
