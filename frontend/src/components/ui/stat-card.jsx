import { cn } from '../../lib/utils';

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'stat-card',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-2 flex items-center gap-1',
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};
