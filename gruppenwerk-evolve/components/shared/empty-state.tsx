import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Leerer Zustand mit Icon, Titel und optionaler Aktion
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps): React.ReactNode {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
