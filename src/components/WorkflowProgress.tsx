import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileCheck, Eye, CheckCircle, Calculator, 
  Clock, AlertTriangle, ArrowRight 
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'active' | 'complete' | 'error';
  description?: string;
}

interface WorkflowProgressProps {
  currentStep: string;
  steps?: WorkflowStep[];
  className?: string;
}

const defaultSteps: WorkflowStep[] = [
  {
    id: 'upload',
    label: 'Upload CAD',
    icon: Upload,
    status: 'pending',
    description: 'Select and upload CAD file'
  },
  {
    id: 'process',
    label: 'Process',
    icon: FileCheck,
    status: 'pending',
    description: 'Extract geometry from file'
  },
  {
    id: 'review',
    label: 'Review',
    icon: Eye,
    status: 'pending',
    description: 'Verify extracted dimensions'
  },
  {
    id: 'approve',
    label: 'Approve',
    icon: CheckCircle,
    status: 'pending',
    description: 'Confirm geometry accuracy'
  },
  {
    id: 'calculate',
    label: 'Calculate',
    icon: Calculator,
    status: 'pending',
    description: 'Generate wind analysis'
  }
];

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentStep,
  steps = defaultSteps,
  className = ""
}) => {
  // Update step statuses based on current step
  const updatedSteps = steps.map((step, index) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    let status: WorkflowStep['status'] = step.status; // Preserve existing status first
    
    // Only update status if not already in error state
    if (step.status !== 'error') {
      if (index < currentIndex) {
        status = 'complete';
      } else if (index === currentIndex) {
        status = 'active';
      } else {
        status = 'pending';
      }
    }
    
    return { ...step, status };
  });

  const getStepIcon = (step: WorkflowStep) => {
    const IconComponent = step.icon;
    const baseClasses = "h-5 w-5";
    
    switch (step.status) {
      case 'complete':
        return <CheckCircle className={`${baseClasses} text-green-600`} />;
      case 'active':
        return <IconComponent className={`${baseClasses} text-blue-600`} />;
      case 'error':
        return <AlertTriangle className={`${baseClasses} text-red-600`} />;
      default:
        return <IconComponent className={`${baseClasses} text-gray-400`} />;
    }
  };

  const getStepBadge = (step: WorkflowStep) => {
    switch (step.status) {
      case 'complete':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">Pending</Badge>;
    }
  };

  const currentStepIndex = updatedSteps.findIndex(s => s.id === currentStep);
  const progressPercentage = currentStepIndex >= 0 ? ((currentStepIndex + 1) / updatedSteps.length) * 100 : 0;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Workflow Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {updatedSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4">
              {/* Step indicator */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center
                ${step.status === 'complete' ? 'border-green-600 bg-green-50' : ''}
                ${step.status === 'active' ? 'border-blue-600 bg-blue-50' : ''}
                ${step.status === 'error' ? 'border-red-600 bg-red-50' : ''}
                ${step.status === 'pending' ? 'border-gray-300 bg-gray-50' : ''}
              `}>
                {getStepIcon(step)}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${
                    step.status === 'active' ? 'text-blue-900' : 
                    step.status === 'complete' ? 'text-green-900' :
                    step.status === 'error' ? 'text-red-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h3>
                  {getStepBadge(step)}
                </div>
                
                {step.description && (
                  <p className={`text-sm ${
                    step.status === 'active' ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                )}
              </div>

              {/* Arrow connector */}
              {index < updatedSteps.length - 1 && (
                <div className="flex-shrink-0">
                  <ArrowRight className={`h-4 w-4 ${
                    step.status === 'complete' ? 'text-green-400' : 'text-gray-300'
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current step info */}
        {currentStepIndex >= 0 && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Current: {updatedSteps[currentStepIndex].label}
              </span>
            </div>
            {updatedSteps[currentStepIndex].description && (
              <p className="text-sm text-blue-700 mt-1 ml-6">
                {updatedSteps[currentStepIndex].description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowProgress;