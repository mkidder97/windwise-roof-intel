import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'md',
  showLabel = false,
  className = ""
}) => {
  // Determine confidence level and styling
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 85) return { level: 'high', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
    if (conf >= 65) return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
    return { level: 'low', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle };
  };

  const { level, color, bgColor, icon: Icon } = getConfidenceLevel(confidence);
  
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const badgeSize = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1'
  };

  if (showLabel) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Icon className={`${sizeClasses[size]} ${color}`} />
        <Badge 
          variant="outline" 
          className={`${badgeSize[size]} ${bgColor} ${color} border-current`}
        >
          {confidence}% confidence
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Icon className={`${sizeClasses[size]} ${color}`} />
      {size !== 'sm' && (
        <span className={`text-xs font-medium ${color}`}>
          {confidence}%
        </span>
      )}
    </div>
  );
};

export default ConfidenceIndicator;