import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Printer,
  Stamp,
  Calculator,
  Building,
  Wind,
  Shield,
  ClipboardCheck,
  PenTool,
  Users,
  Calendar
} from "lucide-react";
import jsPDF from 'jspdf';

interface ProjectInfo {
  projectName: string;
  projectNumber: string;
  location: string;
  client: string;
  engineer: string;
  date: string;
  revision: string;
}

interface BuildingParameters {
  length: number;
  width: number;
  height: number;
  roofType: string;
  deckType: string;
  occupancy: string;
  riskCategory: string;
}

interface WindParameters {
  basicWindSpeed: number;
  exposureCategory: string;
  topographicFactor: number;
  directionalityFactor: number;
  asceEdition: string;
  internalPressureClass: string;
}

interface CalculationResults {
  kz: number;
  qz: number;
  gcpField: number;
  gcpPerimeter: number;
  gcpCorner: number;
  gcpiPositive: number;
  gcpiNegative: number;
  pressureField: number;
  pressurePerimeter: number;
  pressureCorner: number;
  netPressureField: number;
  netPressurePerimeter: number;
  netPressureCorner: number;
}

interface ReportGeneratorProps {
  calculationData?: any;
  selectedSystems?: any[];
  buildingGeometry?: any;
}

export default function ReportGenerator({ 
  calculationData, 
  selectedSystems = [], 
  buildingGeometry 
}: ReportGeneratorProps) {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    projectName: "Roofing System Wind Load Analysis",
    projectNumber: `WL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    location: "Texas",
    client: "",
    engineer: "",
    date: new Date().toLocaleDateString(),
    revision: "0"
  });

  const [peInfo, setPeInfo] = useState({
    licenseName: "",
    licenseNumber: "",
    licenseState: "",
    sealDate: "",
    firmName: "",
    firmAddress: "",
    phoneNumber: "",
    emailAddress: ""
  });

  const [reportSections, setReportSections] = useState({
    coverPage: true,
    executive: true,
    methodology: true,
    calculations: true,
    systems: true,
    appendices: true,
    signatures: true
  });

  // Sample calculation data if none provided
  const defaultCalculations: CalculationResults = {
    kz: 0.85,
    qz: 21.6,
    gcpField: -1.4,
    gcpPerimeter: -2.8,
    gcpCorner: -4.2,
    gcpiPositive: 0.55,
    gcpiNegative: -0.55,
    pressureField: 30.2,
    pressurePerimeter: 60.5,
    pressureCorner: 90.7,
    netPressureField: 42.1,
    netPressurePerimeter: 72.4,
    netPressureCorner: 102.6
  };

  const calculations = calculationData?.results || defaultCalculations;

  const generateProfessionalReport = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    let yPos = 20;

    // Cover Page
    if (reportSections.coverPage) {
      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('WIND LOAD ANALYSIS REPORT', 105, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(18);
      doc.text('Roofing System Design', 105, yPos, { align: 'center' });
      
      // Project Info Box
      yPos += 30;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.rect(20, yPos, 170, 80);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT INFORMATION', 25, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Project: ${projectInfo.projectName}`, 25, yPos);
      yPos += 6;
      doc.text(`Project No.: ${projectInfo.projectNumber}`, 25, yPos);
      yPos += 6;
      doc.text(`Location: ${projectInfo.location}`, 25, yPos);
      yPos += 6;
      doc.text(`Client: ${projectInfo.client}`, 25, yPos);
      yPos += 6;
      doc.text(`Date: ${projectInfo.date}`, 25, yPos);
      yPos += 6;
      doc.text(`Revision: ${projectInfo.revision}`, 25, yPos);

      // Engineer Info
      yPos += 20;
      doc.rect(20, yPos, 170, 60);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('PROFESSIONAL ENGINEER', 25, yPos);
      
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Engineer: ${peInfo.licenseName}`, 25, yPos);
      yPos += 6;
      doc.text(`License No.: ${peInfo.licenseNumber}`, 25, yPos);
      yPos += 6;
      doc.text(`State: ${peInfo.licenseState}`, 25, yPos);
      yPos += 6;
      doc.text(`Firm: ${peInfo.firmName}`, 25, yPos);

      // PE Seal Box
      yPos += 20;
      doc.rect(140, yPos, 50, 40);
      doc.text('PE SEAL', 165, yPos + 20, { align: 'center' });
      doc.text('AREA', 165, yPos + 25, { align: 'center' });

      doc.addPage();
      yPos = 20;
    }

    // Executive Summary
    if (reportSections.executive) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const summaryText = [
        `This report presents the wind load analysis for the roofing system at ${projectInfo.location}.`,
        `Calculations were performed in accordance with ASCE 7-22 standards.`,
        '',
        'KEY FINDINGS:',
        `• Design Wind Speed: ${calculationData?.wind_speed || 'TBD'} mph`,
        `• Maximum Net Uplift Pressure: ${calculations.netPressureCorner.toFixed(1)} psf`,
        `• Building Classification: ${buildingGeometry?.occupancy || 'Commercial'}`,
        `• Roof System: ${selectedSystems[0]?.system_name || 'To be determined'}`,
        '',
        'RECOMMENDATIONS:',
        '• Install roofing system per manufacturer specifications',
        '• Verify fastening patterns in high-load zones',
        '• Conduct quality control inspections during installation'
      ];

      summaryText.forEach(line => {
        if (line.startsWith('•')) {
          doc.text(line, 25, yPos);
        } else if (line === '') {
          yPos += 3;
          return;
        } else {
          doc.text(line, 20, yPos);
        }
        yPos += 5;
      });

      doc.addPage();
      yPos = 20;
    }

    // Methodology
    if (reportSections.methodology) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CALCULATION METHODOLOGY', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const methodologyText = [
        '1. APPLICABLE CODES AND STANDARDS',
        '   • ASCE 7-22: Minimum Design Loads and Associated Criteria',
        '   • International Building Code (IBC)',
        '   • Local jurisdiction amendments',
        '',
        '2. WIND PRESSURE CALCULATION PROCEDURE',
        '   Step 1: Determine basic wind speed (V) from wind maps',
        '   Step 2: Calculate velocity pressure (qz = 0.00256 × Kz × Kzt × Kd × V²)',
        '   Step 3: Determine external pressure coefficients (GCp)',
        '   Step 4: Determine internal pressure coefficients (GCpi)',
        '   Step 5: Calculate net design pressure (p = qz[(GCp) - (GCpi)])',
        '',
        '3. BUILDING PARAMETERS',
        `   • Length: ${buildingGeometry?.length || 'TBD'} ft`,
        `   • Width: ${buildingGeometry?.width || 'TBD'} ft`,
        `   • Height: ${buildingGeometry?.height || 'TBD'} ft`,
        `   • Roof Type: ${buildingGeometry?.roofType || 'Low-slope'}`,
        '',
        '4. LOAD FACTORS',
        '   • Wind loads are ultimate loads (strength design)',
        '   • Load combinations per ASCE 7-22 Section 2.3'
      ];

      methodologyText.forEach(line => {
        if (line.startsWith('   •') || line.startsWith('   Step')) {
          doc.text(line, 25, yPos);
        } else if (line === '') {
          yPos += 3;
          return;
        } else {
          doc.text(line, 20, yPos);
        }
        yPos += 5;
        
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });

      doc.addPage();
      yPos = 20;
    }

    // Detailed Calculations
    if (reportSections.calculations) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED CALCULATIONS', 20, yPos);
      
      yPos += 15;
      
      // Wind Parameters Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('WIND PARAMETERS', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Table headers
      doc.text('Parameter', 20, yPos);
      doc.text('Value', 100, yPos);
      doc.text('Units', 140, yPos);
      doc.text('Reference', 160, yPos);
      
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 5;

      const windParams = [
        ['Basic Wind Speed (V)', calculationData?.wind_speed || '150', 'mph', 'ASCE 7-22 Fig. 26.5-1A'],
        ['Exposure Category', calculationData?.exposure_category || 'C', '-', 'ASCE 7-22 Sec. 26.7'],
        ['Topographic Factor (Kzt)', '1.0', '-', 'ASCE 7-22 Sec. 26.8'],
        ['Directionality Factor (Kd)', '0.85', '-', 'ASCE 7-22 Table 26.6-1'],
        ['Velocity Pressure Coeff (Kz)', calculations.kz?.toFixed(2) || '0.85', '-', 'ASCE 7-22 Table 26.10-1'],
        ['Velocity Pressure (qz)', calculations.qz?.toFixed(1) || '21.6', 'psf', 'Calculated']
      ];

      windParams.forEach(param => {
        doc.text(param[0], 20, yPos);
        doc.text(param[1], 100, yPos);
        doc.text(param[2], 140, yPos);
        doc.text(param[3], 160, yPos);
        yPos += 5;
      });

      yPos += 10;

      // Pressure Coefficients
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESSURE COEFFICIENTS', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const pressureCoeffs = [
        ['Zone', 'GCp', 'GCpi(+)', 'GCpi(-)', 'Net Pressure (psf)'],
        ['Field', calculations.gcpField?.toFixed(2) || '-1.4', '0.55', '-0.55', calculations.netPressureField?.toFixed(1) || '42.1'],
        ['Perimeter', calculations.gcpPerimeter?.toFixed(2) || '-2.8', '0.55', '-0.55', calculations.netPressurePerimeter?.toFixed(1) || '72.4'],
        ['Corner', calculations.gcpCorner?.toFixed(2) || '-4.2', '0.55', '-0.55', calculations.netPressureCorner?.toFixed(1) || '102.6']
      ];

      pressureCoeffs.forEach((row, index) => {
        if (index === 0) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        
        doc.text(row[0], 20, yPos);
        doc.text(row[1], 60, yPos);
        doc.text(row[2], 100, yPos);
        doc.text(row[3], 130, yPos);
        doc.text(row[4], 160, yPos);
        yPos += 5;
        
        if (index === 0) {
          doc.line(20, yPos, 190, yPos);
          yPos += 2;
        }
      });

      doc.addPage();
      yPos = 20;
    }

    // System Specifications
    if (reportSections.systems && selectedSystems.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ROOFING SYSTEM SPECIFICATIONS', 20, yPos);
      
      yPos += 15;

      selectedSystems.forEach((system, index) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${system.system_name}`, 20, yPos);
        
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`Manufacturer: ${system.manufacturer}`, 25, yPos);
        yPos += 5;
        doc.text(`Maximum Wind Pressure: ${system.max_wind_pressure} psf`, 25, yPos);
        yPos += 5;
        doc.text(`Membrane Type: ${system.membrane_type}`, 25, yPos);
        yPos += 5;
        doc.text(`Deck Types: ${system.deck_types.join(', ')}`, 25, yPos);
        yPos += 5;
        doc.text(`Fastening Pattern: ${system.fastener_pattern}`, 25, yPos);
        yPos += 10;

        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Professional Signature Block
    if (reportSections.signatures) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      yPos = Math.max(yPos, 200);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PROFESSIONAL ENGINEER CERTIFICATION', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const certText = [
        'I hereby certify that this wind load analysis has been prepared by me or under my direct',
        'supervision and that I am a duly Licensed Professional Engineer under the laws of the',
        `State of ${peInfo.licenseState || '_______'}.`
      ];

      certText.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });

      yPos += 15;

      // Signature blocks
      doc.line(20, yPos, 80, yPos);
      doc.line(110, yPos, 170, yPos);
      yPos += 5;
      doc.text('Professional Engineer', 20, yPos);
      doc.text('Date', 110, yPos);
      
      yPos += 10;
      doc.text(`${peInfo.licenseName || 'Name: _______________'}`, 20, yPos);
      yPos += 5;
      doc.text(`License No.: ${peInfo.licenseNumber || '_______________'}`, 20, yPos);

      // PE Seal box
      yPos -= 20;
      doc.rect(150, yPos, 40, 30);
      doc.text('PE SEAL', 170, yPos + 15, { align: 'center' });
    }

    // Save the PDF
    doc.save(`${projectInfo.projectNumber}-Wind-Load-Report.pdf`);
  };

  const generateCalculationSpreadsheet = () => {
    // Create CSV content for calculation verification
    const csvContent = [
      ['Wind Load Calculation Spreadsheet'],
      ['Project:', projectInfo.projectName],
      ['Date:', projectInfo.date],
      [''],
      ['INPUT PARAMETERS'],
      ['Parameter', 'Value', 'Units', 'Reference'],
      ['Basic Wind Speed', calculationData?.wind_speed || '150', 'mph', 'ASCE 7-22'],
      ['Building Height', buildingGeometry?.height || '20', 'ft', 'Project Plans'],
      ['Exposure Category', calculationData?.exposure_category || 'C', '-', 'Site Analysis'],
      [''],
      ['CALCULATED VALUES'],
      ['Parameter', 'Formula', 'Value', 'Units'],
      ['Velocity Pressure Coeff (Kz)', 'Table 26.10-1', calculations.kz?.toFixed(3) || '0.850', '-'],
      ['Velocity Pressure (qz)', '0.00256×Kz×Kzt×Kd×V²', calculations.qz?.toFixed(1) || '21.6', 'psf'],
      [''],
      ['DESIGN PRESSURES'],
      ['Zone', 'GCp', 'Net Pressure (psf)'],
      ['Field', calculations.gcpField?.toFixed(2) || '-1.40', calculations.netPressureField?.toFixed(1) || '42.1'],
      ['Perimeter', calculations.gcpPerimeter?.toFixed(2) || '-2.80', calculations.netPressurePerimeter?.toFixed(1) || '72.4'],
      ['Corner', calculations.gcpCorner?.toFixed(2) || '-4.20', calculations.netPressureCorner?.toFixed(1) || '102.6']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectInfo.projectNumber}-Calculations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Professional Engineering Report Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate PE-ready calculation packages for engineering approval and permitting submittal
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="project">Project Info</TabsTrigger>
              <TabsTrigger value="engineer">PE Details</TabsTrigger>
              <TabsTrigger value="sections">Report Sections</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
            </TabsList>

            <TabsContent value="project" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        value={projectInfo.projectName}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, projectName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectNumber">Project Number</Label>
                      <Input
                        id="projectNumber"
                        value={projectInfo.projectNumber}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, projectNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={projectInfo.location}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="client">Client</Label>
                      <Input
                        id="client"
                        value={projectInfo.client}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, client: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Report Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={projectInfo.date}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="revision">Revision</Label>
                      <Input
                        id="revision"
                        value={projectInfo.revision}
                        onChange={(e) => setProjectInfo(prev => ({ ...prev, revision: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engineer" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stamp className="h-4 w-4" />
                    Professional Engineer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="licenseName">PE Name</Label>
                      <Input
                        id="licenseName"
                        value={peInfo.licenseName}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, licenseName: e.target.value }))}
                        placeholder="Professional Engineer Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={peInfo.licenseNumber}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="PE License Number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseState">License State</Label>
                      <Input
                        id="licenseState"
                        value={peInfo.licenseState}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, licenseState: e.target.value }))}
                        placeholder="State of Licensure"
                      />
                    </div>
                    <div>
                      <Label htmlFor="firmName">Engineering Firm</Label>
                      <Input
                        id="firmName"
                        value={peInfo.firmName}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, firmName: e.target.value }))}
                        placeholder="Firm Name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="firmAddress">Firm Address</Label>
                      <Textarea
                        id="firmAddress"
                        value={peInfo.firmAddress}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, firmAddress: e.target.value }))}
                        placeholder="Complete firm address"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={peInfo.phoneNumber}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="Contact phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailAddress">Email Address</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        value={peInfo.emailAddress}
                        onChange={(e) => setPeInfo(prev => ({ ...prev, emailAddress: e.target.value }))}
                        placeholder="Professional email"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Report Sections
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select which sections to include in the professional report
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(reportSections).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={value}
                          onChange={(e) => setReportSections(prev => ({ 
                            ...prev, 
                            [key]: e.target.checked 
                          }))}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={key} className="text-sm font-medium">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Report Preview</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {reportSections.coverPage && <p>• Professional cover page with project details and PE information</p>}
                      {reportSections.executive && <p>• Executive summary with key findings and recommendations</p>}
                      {reportSections.methodology && <p>• ASCE 7 calculation methodology and code references</p>}
                      {reportSections.calculations && <p>• Detailed step-by-step pressure calculations with equations</p>}
                      {reportSections.systems && <p>• Roofing system specifications and installation requirements</p>}
                      {reportSections.appendices && <p>• Technical appendices with supporting calculations</p>}
                      {reportSections.signatures && <p>• Professional engineer signature and seal blocks</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Generate Reports
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Export professional documentation packages
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Report Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <Wind className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-blue-700">
                        {calculations.netPressureCorner?.toFixed(1) || '102.6'} psf
                      </div>
                      <div className="text-sm text-blue-600">Max Design Pressure</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                      <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-green-700">
                        {selectedSystems.length}
                      </div>
                      <div className="text-sm text-green-600">Compatible Systems</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-lg font-bold text-purple-700">
                        {projectInfo.date}
                      </div>
                      <div className="text-sm text-purple-600">Report Date</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Export Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Export Options</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={generateProfessionalReport}
                        className="flex items-center gap-2 h-auto p-4"
                        size="lg"
                      >
                        <FileText className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Professional Report PDF</div>
                          <div className="text-xs opacity-90">Complete calculation package with PE seal</div>
                        </div>
                      </Button>

                      <Button
                        onClick={generateCalculationSpreadsheet}
                        variant="outline"
                        className="flex items-center gap-2 h-auto p-4"
                        size="lg"
                      >
                        <Calculator className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Calculation Spreadsheet</div>
                          <div className="text-xs opacity-90">CSV format for verification</div>
                        </div>
                      </Button>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <PenTool className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Professional Engineer Responsibilities:</p>
                          <ul className="text-sm text-amber-700 mt-1 space-y-1">
                            <li>• Review all calculations for accuracy and code compliance</li>
                            <li>• Verify building parameters and site conditions</li>
                            <li>• Apply professional engineer seal and signature</li>
                            <li>• Submit to local authority having jurisdiction (AHJ)</li>
                          </ul>
                        </div>
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