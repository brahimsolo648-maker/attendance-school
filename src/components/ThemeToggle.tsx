import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-3">
      <Sun className="w-5 h-5 text-accent" />
      <Switch
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
        className="data-[state=checked]:bg-primary"
      />
      <Moon className="w-5 h-5 text-primary" />
    </div>
  );
};

export default ThemeToggle;
