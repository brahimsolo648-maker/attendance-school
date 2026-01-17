import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSections } from '@/hooks/useSections';

const Statistics = () => {
  const navigate = useNavigate();
  const { data: sections = [] } = useSections();

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

  // Calculate section-wise statistics and sort by attendance rate (highest first)
  const sectionStats = useMemo(() => {
    return sections.map(section => {
      const sectionStudents = students.filter((s: any) => s.section_id === section.id);
      const sectionAbsences = absenceRecords.filter((a: any) => 
        sectionStudents.some((s: any) => s.id === a.student_id)
      );
      const sectionAttendance = attendanceRecords.filter((a: any) => 
        sectionStudents.some((s: any) => s.id === a.student_id) && a.check_in_time
      );
      
      const sectionTotal = sectionAttendance.length + sectionAbsences.length;
      const rate = sectionTotal > 0 ? Math.round((sectionAttendance.length / sectionTotal) * 100) : 100;
      const absencePercent = sectionTotal > 0 ? Math.round((sectionAbsences.length / sectionTotal) * 100) : 0;
      
      return {
        id: section.id,
        name: section.name,
        fullName: section.full_name,
        attendanceCount: sectionAttendance.length,
        absenceCount: sectionAbsences.length,
        attendanceRate: rate,
        absenceRate: absencePercent,
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate); // Sort by attendance rate descending
  }, [sections, students, absenceRecords, attendanceRecords]);

  // Bar chart data for sections
  const chartData = sectionStats.map(s => ({
    name: s.name.length > 8 ? s.name.substring(0, 8) + '...' : s.name,
    fullName: s.fullName,
    حضور: s.attendanceCount,
    غياب: s.absenceCount,
    attendanceRate: s.attendanceRate,
  }));

  return (
    <div className="page-container min-h-screen">
      {/* Header */}
      <header className="glass-nav">
        <div className="content-container flex items-center justify-between h-16">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/control-panel/dashboard')}
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
        
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Attendance Card */}
          <Card className="glass-card bg-success/10 border-success/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                إجمالي عدد الحضور
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
                إجمالي عدد الغياب
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

        {/* Calculation Info */}
        <div className="glass-card p-3 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-medium">طريقة الحساب:</span> نسبة الحضور = الحضور ÷ (الحضور + الغياب) × 100
          </p>
        </div>

        {/* Bar Chart - Sections Comparison */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              مقارنة الأقسام (مرتبة حسب نسبة الحضور)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={chartData} 
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    fontSize={11} 
                    width={80}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `${payload[0].payload.fullName} (${payload[0].payload.attendanceRate}%)`;
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="حضور" 
                    fill="hsl(var(--success))" 
                    radius={[0, 4, 4, 0]}
                    name="حضور"
                  />
                  <Bar 
                    dataKey="غياب" 
                    fill="hsl(var(--destructive))" 
                    radius={[0, 4, 4, 0]}
                    name="غياب"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد بيانات متاحة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Details Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              تفاصيل الأقسام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الترتيب</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">القسم</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الحضور</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الغياب</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionStats.map((section, index) => (
                    <tr 
                      key={section.id} 
                      className={`border-b border-border/50 ${
                        section.attendanceRate >= 90 ? 'bg-success/5' :
                        section.attendanceRate >= 70 ? 'bg-yellow-500/5' :
                        'bg-destructive/5'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-primary">{index + 1}</td>
                      <td className="py-3 px-4 font-medium">{section.fullName}</td>
                      <td className="py-3 px-4">
                        <span className="text-success font-medium">{section.attendanceCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-destructive font-medium">{section.absenceCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                section.attendanceRate >= 90 ? 'bg-success' :
                                section.attendanceRate >= 70 ? 'bg-yellow-500' :
                                'bg-destructive'
                              }`}
                              style={{ width: `${section.attendanceRate}%` }}
                            />
                          </div>
                          <span className={`font-bold text-sm ${
                            section.attendanceRate >= 90 ? 'text-success' :
                            section.attendanceRate >= 70 ? 'text-yellow-600' :
                            'text-destructive'
                          }`}>
                            {section.attendanceRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Statistics;
