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
      <header className="border-b border-border p-2 flex justify-between items-center">
        <div className="text-xl font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          {showThemeToggle && <ThemeToggle />}
          {actions}
        </div>
      </header>
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
} 