import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle, 
  Timer,
  ThermometerSun,
  Wind,
  Wrench,
  Eye,
  FileCheck,
  Settings
} from "lucide-react";

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  critical: boolean;
  estimatedTime: string;
  requirements: string[];
  qualityChecks: string[];
}

interface InstallationSpecsProps {
  systemName: string;
  deckType: string;
  membraneType: string;
  manufacturer: string;
}

export default function InstallationSpecifications({ 
  systemName, 
  deckType, 
  membraneType, 
  manufacturer 
}: InstallationSpecsProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('procedures');

  const installationSteps: InstallationStep[] = [
    {
      id: 'prep',
      title: 'Surface Preparation',
      description: 'Clean and prepare the deck surface for membrane installation',
      critical: true,
      estimatedTime: '2-4 hours',
      requirements: [
        'Remove all debris and loose materials',
        'Verify deck fasteners are flush or below surface',
        'Fill gaps and holes in deck greater than 1/4"',
        'Ensure surface is dry (moisture content <19% for wood)'
      ],
      qualityChecks: [
        'Visual inspection for cleanliness',
        'Moisture meter readings documented',
        'Deck smoothness verified with straightedge',
        'All prep work photographed'
      ]
    },
    {
      id: 'layout',
      title: 'Layout and Measurement',
      description: 'Mark fastening patterns and membrane layout lines',
      critical: true,
      estimatedTime: '1-2 hours',
      requirements: [
        'Mark roof zones (field, perimeter, corner)',
        'Layout fastening pattern grid lines',
        'Mark membrane starting point and direction',
        'Verify all measurements twice'
      ],
      qualityChecks: [
        'Grid pattern accuracy ±1/4"',
        'Zone boundaries clearly marked',
        'Layout approved by foreman',
        'Measurements verified by second person'
      ]
    },
    {
      id: 'fastening',
      title: 'Fastener Installation',
      description: 'Install fasteners according to approved pattern',
      critical: true,
      estimatedTime: '4-8 hours',
      requirements: [
        'Use only approved fastener types and sizes',
        'Maintain specified spacing tolerances',
        'Apply correct torque values',
        'Install plates flush with membrane surface'
      ],
      qualityChecks: [
        'Random torque verification (10% of fasteners)',
        'Spacing tolerance verification',
        'Plate alignment and penetration depth',
        'No damaged threads or stripped fasteners'
      ]
    },
    {
      id: 'membrane',
      title: 'Membrane Installation',
      description: 'Install membrane with proper overlap and seaming',
      critical: true,
      estimatedTime: '6-12 hours',
      requirements: [
        'Maintain minimum 3" side overlap',
        'Achieve proper seam strength',
        'Avoid membrane stress and wrinkles',
        'Complete installation before wind speeds exceed 25 mph'
      ],
      qualityChecks: [
        'Seam peel test (5 lbs/in minimum)',
        'Visual inspection for wrinkles/stress',
        'Overlap measurements verified',
        'Weather conditions documented'
      ]
    },
    {
      id: 'testing',
      title: 'Field Testing and QC',
      description: 'Perform required field tests and quality control',
      critical: true,
      estimatedTime: '2-3 hours',
      requirements: [
        'Perform uplift testing per manufacturer requirements',
        'Complete pull test on representative fasteners',
        'Document all test results',
        'Address any failures immediately'
      ],
      qualityChecks: [
        'Pull test results meet or exceed design loads',
        'No fastener failures during testing',
        'Test locations properly sealed',
        'All documentation complete and signed'
      ]
    },
    {
      id: 'final',
      title: 'Final Inspection',
      description: 'Complete final inspection and documentation',
      critical: false,
      estimatedTime: '1 hour',
      requirements: [
        'Visual inspection of entire installation',
        'Verify all fasteners are properly installed',
        'Check for any damage or defects',
        'Complete installation documentation'
      ],
      qualityChecks: [
        'Installation matches approved drawings',
        'All required tests completed',
        'Documentation package complete',
        'Owner/architect acceptance obtained'
      ]
    }
  ];

  const qualityStandards = {
    fastenerTorque: {
      steel: '15-20 ft-lbs',
      concrete: '25-30 ft-lbs',
      wood: '12-18 ft-lbs'
    },
    pullTestRequirements: {
      field: '150 lbs minimum',
      perimeter: '200 lbs minimum',
      corner: '250 lbs minimum'
    },
    environmentalLimits: {
      temperature: '40°F - 100°F',
      windSpeed: '< 25 mph',
      humidity: '< 85%',
      precipitation: 'None during installation'
    }
  };

  const manufacturerRequirements = {
    [manufacturer]: {
      certifiedInstallers: true,
      specificTools: ['Calibrated torque wrench', 'Digital moisture meter', 'Pull test equipment'],
      warranties: ['10-year material', '2-year installation'],
      inspectionPoints: ['30%', '60%', '100%']
    }
  };

  const toggleStepCompletion = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const getCompletionPercentage = () => {
    return Math.round((completedSteps.length / installationSteps.length) * 100);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Installation Specifications - {systemName}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{deckType} Deck</Badge>
            <Badge variant="outline">{membraneType}</Badge>
            <Badge variant="outline">{manufacturer}</Badge>
            <div className="ml-auto">
              <Badge className={
                getCompletionPercentage() === 100 
                  ? "bg-success text-success-foreground"
                  : "bg-primary text-primary-foreground"
              }>
                {getCompletionPercentage()}% Complete
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="quality">Quality Control</TabsTrigger>
              <TabsTrigger value="testing">Field Testing</TabsTrigger>
              <TabsTrigger value="manufacturer">Manufacturer Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="procedures" className="space-y-4">
              <div className="space-y-4">
                {installationSteps.map((step, index) => (
                  <Card key={step.id} className={`border-l-4 ${
                    step.critical ? 'border-l-red-500' : 'border-l-blue-500'
                  } ${completedSteps.includes(step.id) ? 'bg-success-light' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={completedSteps.includes(step.id)}
                            onCheckedChange={() => toggleStepCompletion(step.id)}
                          />
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                              {step.title}
                              {step.critical && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Timer className="h-4 w-4" />
                              {step.estimatedTime}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {step.description}
                          </p>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-sm mb-2">Requirements:</h5>
                              <ul className="space-y-1">
                                {step.requirements.map((req, idx) => (
                                  <li key={idx} className="text-sm flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 text-success mt-1 flex-shrink-0" />
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-sm mb-2">Quality Checks:</h5>
                              <ul className="space-y-1">
                                {step.qualityChecks.map((check, idx) => (
                                  <li key={idx} className="text-sm flex items-start gap-2">
                                    <Eye className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                                    {check}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Fastener Torque Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Steel Deck:</span>
                      <span className="font-semibold">{qualityStandards.fastenerTorque.steel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Concrete Deck:</span>
                      <span className="font-semibold">{qualityStandards.fastenerTorque.concrete}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wood Deck:</span>
                      <span className="font-semibold">{qualityStandards.fastenerTorque.wood}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Pull Test Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Field Zone:</span>
                      <span className="font-semibold">{qualityStandards.pullTestRequirements.field}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Perimeter Zone:</span>
                      <span className="font-semibold">{qualityStandards.pullTestRequirements.perimeter}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corner Zone:</span>
                      <span className="font-semibold">{qualityStandards.pullTestRequirements.corner}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ThermometerSun className="h-4 w-4" />
                    Environmental Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <ThermometerSun className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Temperature</p>
                      <p className="text-xs text-muted-foreground">{qualityStandards.environmentalLimits.temperature}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                      <Wind className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Wind Speed</p>
                      <p className="text-xs text-muted-foreground">{qualityStandards.environmentalLimits.windSpeed}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Humidity</p>
                      <p className="text-xs text-muted-foreground">{qualityStandards.environmentalLimits.humidity}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <CheckCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Weather</p>
                      <p className="text-xs text-muted-foreground">{qualityStandards.environmentalLimits.precipitation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Field Testing Procedures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Critical Testing Requirements
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Pull tests must be performed at 1% of fasteners (minimum 5 tests)</li>
                      <li>• Test locations must represent each roof zone (field, perimeter, corner)</li>
                      <li>• Failed tests require additional testing in adjacent areas</li>
                      <li>• All test locations must be properly sealed after testing</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Test Equipment Required:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• Calibrated pull test apparatus</li>
                        <li>• Digital force gauge (±2% accuracy)</li>
                        <li>• Test plates and adapters</li>
                        <li>• Sealant for test hole repair</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Documentation Required:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• Test location map</li>
                        <li>• Force readings for each test</li>
                        <li>• Photo documentation</li>
                        <li>• Test technician certification</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manufacturer" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {manufacturer} Specific Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-3">Installer Requirements:</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm">Factory certified installers required</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm">Current certification on file</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm">Site supervision required</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3">Required Tools:</h5>
                      <ul className="space-y-1 text-sm">
                        {manufacturerRequirements[manufacturer]?.specificTools.map((tool, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-success" />
                            {tool}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-3">Warranty Coverage:</h5>
                      <ul className="space-y-1 text-sm">
                        {manufacturerRequirements[manufacturer]?.warranties.map((warranty, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-success" />
                            {warranty}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3">Required Inspections:</h5>
                      <div className="space-y-2">
                        {manufacturerRequirements[manufacturer]?.inspectionPoints.map((point, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {point} Complete
                            </Badge>
                            <span className="text-sm">Factory inspection required</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}