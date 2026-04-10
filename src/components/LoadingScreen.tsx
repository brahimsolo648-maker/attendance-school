import schoolIcon from '@/assets/schoolos-icon.png';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Icon with pulse */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg animate-pulse">
          <img src={schoolIcon} alt="SchoolOS" className="w-full h-full object-contain" />
        </div>

        {/* App name */}
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
          School<span className="text-primary">OS</span>
        </h1>

        {/* Spinner */}
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />

        {/* Loading text */}
        <p className="text-sm text-muted-foreground">يرجى الانتظار، جاري تحميل البيانات...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
