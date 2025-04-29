import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ArduinoStatus {
  connected: boolean;
  simulationMode: boolean;
  sensorStatus: string;
  port: string;
  baudRate: number;
  firmwareVersion: string;
  enrolledTemplates: number;
}

export default function ArduinoSimulationToggle() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current Arduino status
  const { data: arduinoStatus, isLoading: isStatusLoading } = useQuery<ArduinoStatus>({
    queryKey: ["/api/arduino/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Local state for the toggle
  const [simulationEnabled, setSimulationEnabled] = useState(true);

  // Update local state when the server status is fetched
  useEffect(() => {
    if (arduinoStatus) {
      setSimulationEnabled(arduinoStatus.simulationMode);
    }
  }, [arduinoStatus]);

  const toggleSimulation = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/arduino/toggle-simulation",
        { useSimulation: !simulationEnabled }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setSimulationEnabled(data.simulationMode);
        
        toast({
          title: "Simulation Mode Changed",
          description: data.message,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/arduino/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hardware/status"] });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to change simulation mode",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while changing simulation mode",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Arduino Hardware Mode</CardTitle>
        <CardDescription>
          Toggle between real hardware and simulation mode for fingerprint sensor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium mb-1">
                Simulation Mode
              </div>
              <p className="text-sm text-muted-foreground">
                {simulationEnabled 
                  ? "Running in simulation mode (no hardware needed)" 
                  : "Using real hardware fingerprint sensor"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={simulationEnabled}
                onCheckedChange={toggleSimulation}
                disabled={isLoading}
                aria-label="Toggle simulation mode"
              />
              <Label htmlFor="simulation-mode">
                {simulationEnabled ? "On" : "Off"}
              </Label>
            </div>
          </div>
          
          {isStatusLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Loading status...</span>
            </div>
          ) : arduinoStatus ? (
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Connection</span>
                <span className={arduinoStatus.connected ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {arduinoStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Sensor Status</span>
                <span className="font-medium">{arduinoStatus.sensorStatus}</span>
              </div>
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Port</span>
                <span className="font-mono text-xs">{arduinoStatus.port}</span>
              </div>
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Baud Rate</span>
                <span className="font-mono text-xs">{arduinoStatus.baudRate}</span>
              </div>
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Firmware</span>
                <span className="font-mono text-xs">{arduinoStatus.firmwareVersion}</span>
              </div>
              <div className="flex flex-col p-2 border rounded-md">
                <span className="text-muted-foreground">Templates</span>
                <span className="font-mono text-xs">{arduinoStatus.enrolledTemplates}</span>
              </div>
            </div>
          ) : null}
          
          <div className="flex justify-end space-x-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/arduino/status"] })}
              disabled={isLoading}
            >
              Refresh
            </Button>
            
            <Button
              variant={simulationEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleSimulation}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                simulationEnabled ? "Disable Simulation" : "Enable Simulation"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}