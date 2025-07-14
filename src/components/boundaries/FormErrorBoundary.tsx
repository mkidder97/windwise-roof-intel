import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, FileX, Undo } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onFormReset?: () => void;
  preserveFormData?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  lastValidFormData: any;
}

class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      lastValidFormData: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FormErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo,
    });

    // Preserve form data if enabled
    if (this.props.preserveFormData) {
      this.preserveFormData();
    }

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Show user-friendly notification
    toast({
      title: "Form Error",
      description: "A form component encountered an error. Your data has been preserved.",
      variant: "destructive",
    });
  }

  private preserveFormData = () => {
    try {
      // Try to extract form data from various sources
      const forms = document.querySelectorAll('form');
      const formData: any = {};

      forms.forEach((form, index) => {
        const data = new FormData(form);
        const formObj: any = {};
        
        data.forEach((value, key) => {
          formObj[key] = value;
        });
        
        if (Object.keys(formObj).length > 0) {
          formData[`form_${index}`] = formObj;
        }
      });

      // Also check for any input elements not in forms
      const inputs = document.querySelectorAll('input, select, textarea');
      const standaloneInputs: any = {};
      
      inputs.forEach((input: any) => {
        if (input.name && !input.closest('form')) {
          standaloneInputs[input.name] = input.value;
        }
      });

      if (Object.keys(standaloneInputs).length > 0) {
        formData.standalone = standaloneInputs;
      }

      this.setState({ lastValidFormData: formData });
      
      // Also save to localStorage as backup
      localStorage.setItem('form_error_backup', JSON.stringify({
        timestamp: Date.now(),
        data: formData,
      }));

      console.log('Form data preserved:', formData);
    } catch (preserveError) {
      console.error('Failed to preserve form data:', preserveError);
    }
  };

  private restoreFormData = () => {
    try {
      const { lastValidFormData } = this.state;
      
      if (lastValidFormData) {
        // Attempt to restore form data
        Object.entries(lastValidFormData).forEach(([formKey, formObj]: [string, any]) => {
          if (formKey === 'standalone') {
            // Restore standalone inputs
            Object.entries(formObj).forEach(([name, value]: [string, any]) => {
              const input = document.querySelector(`[name="${name}"]`) as HTMLInputElement;
              if (input) {
                input.value = value;
                // Trigger change event to update React state
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          } else {
            // Restore form inputs
            Object.entries(formObj).forEach(([name, value]: [string, any]) => {
              const input = document.querySelector(`[name="${name}"]`) as HTMLInputElement;
              if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          }
        });

        toast({
          title: "Form Data Restored",
          description: "Your previous form data has been restored.",
        });
      }
    } catch (restoreError) {
      console.error('Failed to restore form data:', restoreError);
      toast({
        title: "Restore Failed",
        description: "Could not restore form data automatically.",
        variant: "destructive",
      });
    }
  };

  private resetComponent = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private resetForm = () => {
    if (this.props.onFormReset) {
      this.props.onFormReset();
    } else {
      // Default form reset behavior
      const forms = document.querySelectorAll('form');
      forms.forEach(form => form.reset());
    }
    
    this.resetComponent();
    
    toast({
      title: "Form Reset",
      description: "The form has been reset to its initial state.",
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { error, lastValidFormData } = this.state;

      return (
        <div className="p-6 space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Form Component Error</AlertTitle>
            <AlertDescription>
              A form component has encountered an error and stopped working properly. 
              {this.props.preserveFormData && " Your form data has been preserved."}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileX className="h-5 w-5" />
                Recovery Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={this.resetComponent}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                {lastValidFormData && (
                  <Button 
                    variant="outline"
                    onClick={this.restoreFormData}
                    className="flex items-center gap-2"
                  >
                    <Undo className="h-4 w-4" />
                    Restore Data
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={this.resetForm}
                  className="flex items-center gap-2"
                >
                  <FileX className="h-4 w-4" />
                  Reset Form
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">What happened?</h4>
                <p className="text-sm text-muted-foreground">
                  One of the form components encountered an unexpected error. This might be due to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Invalid data in a form field</li>
                  <li>Network connectivity issues</li>
                  <li>Browser compatibility problems</li>
                  <li>Temporary application issues</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommended actions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    <strong>Try Again:</strong> Attempts to restore the form component
                  </li>
                  {lastValidFormData && (
                    <li>
                      <strong>Restore Data:</strong> Restores your previously entered data
                    </li>
                  )}
                  <li>
                    <strong>Reset Form:</strong> Clears all data and starts fresh
                  </li>
                  <li>
                    <strong>Reload Page:</strong> Completely refreshes the application
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="font-medium">Error:</span> {error?.name}
                  </div>
                  <div>
                    <span className="font-medium">Message:</span> {error?.message}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {new Date().toLocaleTimeString()}
                  </div>
                  {lastValidFormData && (
                    <div>
                      <span className="font-medium">Data Preserved:</span> Yes
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  If this error continues to occur, please try refreshing the page or contact support.
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

export default FormErrorBoundary;