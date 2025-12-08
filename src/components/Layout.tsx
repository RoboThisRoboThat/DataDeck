import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  showThemeToggle?: boolean;
}

export function Layout({
  children,
  title = 'Data Deck',
  actions,
  showThemeToggle = true,
}: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground w-screen">
      <header className="border-b border-border px-3 py-2 flex justify-between items-center bg-gradient-to-r from-background/80 via-background/70 to-background/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm shadow-sm">
        <div className="text-lg font-semibold flex items-center gap-2 text-foreground">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {showThemeToggle && <ThemeToggle />}
          {actions}
        </div>
      </header>
      
      <main className="flex-1 overflow-auto bg-background/90">
        <div className="h-full w-full">{children}</div>
      </main>
    </div>
  );
} 