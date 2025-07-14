import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  ChevronDown, 
  Copy,
  ExternalLink 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
  isDetailsOpen: boolean;
}

class CalculationErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isDetailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CalculationErrorBoundary caught an error:', error, errorInfo);
    
    // Generate a unique error ID for tracking
    const eventId = `calc_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      errorInfo,
      eventId,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Report to monitoring system (implement based on your monitoring setup)
    this.reportError(error, errorInfo, eventId);

    // Show toast notification
    toast({
      title: "Calculation Error",
      description: "An error occurred during calculation. The form data has been preserved.",
      variant: "destructive",
    });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, index) => key !== prevProps.resetKeys?.[index])) {
        this.resetErrorBoundary();
      }
    }
    
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        eventId: null,
        isDetailsOpen: false,
      });
    }, 100);
  };

  private async reportError(error: Error, errorInfo: React.ErrorInfo, eventId: string) {
    try {
      // Implement error reporting to your monitoring service
      // This could be Sentry, LogRocket, or your custom error tracking
      const errorReport = {
        eventId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'anonymous', // Replace with actual user ID if available
      };

      // Example: Send to your error tracking service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });

      console.log('Error reported:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private copyErrorDetails = () => {
    const { error, errorInfo, eventId } = this.state;
    const errorDetails = {
      eventId,
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    toast({
      title: "Error details copied",
      description: "Error information has been copied to clipboard",
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { error, errorInfo, eventId, isDetailsOpen } = this.state;

      return (
        <div className="p-6 space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Calculation Error Occurred</AlertTitle>
            <AlertDescription>
              Something went wrong during the wind calculation process. Your form data has been 
              preserved and you can try again.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bug className="h-5 w-5" />
                Error Recovery Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={this.resetErrorBoundary} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.copyErrorDetails}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Error Details
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">What you can try:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click "Try Again" to retry the calculation with the same parameters</li>
                  <li>Check your internet connection and try again</li>
                  <li>Verify that all form fields contain valid values</li>
                  <li>Try reducing the complexity of your calculation parameters</li>
                  <li>Reload the page if the error persists</li>
                </ul>
              </div>

              <Collapsible 
                open={isDetailsOpen} 
                onOpenChange={setOpen => this.setState({ isDetailsOpen: setOpen })}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
                    Technical Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium">Error ID:</span> {eventId}
                      </div>
                      <div>
                        <span className="font-medium">Error Type:</span> {error?.name}
                      </div>
                      <div>
                        <span className="font-medium">Message:</span> {error?.message}
                      </div>
                      <div>
                        <span className="font-medium">Timestamp:</span> {new Date().toISOString()}
                      </div>
                    </div>
                  </div>

                  {error?.stack && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium">Stack Trace:</span>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium">Component Stack:</span>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  If this error continues to occur, please contact support with Error ID: {eventId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalculationErrorBoundary;