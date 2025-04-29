import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HardwareStatus } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { CircleCheck, CircleSlash, RefreshCw, Settings } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

const BiometricStatus: React.FC = () => {
  const [status, setStatus] = useState<HardwareStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchHardwareStatus();
  }, []);

  const fetchHardwareStatus = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/hardware/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch hardware status",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch hardware status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/hardware/test-connection",
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Connection Test",
          description: data.message || "Hardware connection test completed successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/hardware/status"] });
        fetchHardwareStatus();
      } else {
        toast({
          variant: "destructive",
          title: "Connection Test Failed",
          description: data.message || "Failed to test hardware connection.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Test Error",
        description: "An error occurred during the connection test.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calibrateSensors = async () => {
    try {
      setIsCalibrating(true);
      
      const response = await apiRequest(
        "POST",
        "/api/hardware/calibrate",
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Calibration Complete",
          description: data.message || "Hardware calibration completed successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/hardware/status"] });
        fetchHardwareStatus();
      } else {
        toast({
          variant: "destructive",
          title: "Calibration Failed",
          description: data.message || "Failed to calibrate hardware.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Calibration Error",
        description: "An error occurred during hardware calibration.",
      });
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Biometric Hardware Status</CardTitle>
        <CardDescription>Arduino Uno with R307 fingerprint sensor</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-t border-neutral-200">
          <dl>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-neutral-50">
              <dt className="text-sm font-medium text-neutral-500">Fingerprint Scanner</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2 flex items-center">
                {status ? (
                  <>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.fingerprintScannerConnected 
                        ? "bg-success bg-opacity-10 text-success" 
                        : "bg-error bg-opacity-10 text-error"
                    }`}>
                      {status.fingerprintScannerConnected ? (
                        <>
                          <CircleCheck className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <CircleSlash className="h-3 w-3 mr-1" />
                          Disconnected
                        </>
                      )}
                    </span>
                    {status.lastActiveFingerprint && (
                      <span className="ml-2 text-xs text-neutral-500">
                        Last active: {formatTimestamp(status.lastActiveFingerprint)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Loading status...</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-neutral-500">Face Recognition Camera</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2 flex items-center">
                {status ? (
                  <>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.facialRecognitionConnected 
                        ? "bg-success bg-opacity-10 text-success" 
                        : "bg-error bg-opacity-10 text-error"
                    }`}>
                      {status.facialRecognitionConnected ? (
                        <>
                          <CircleCheck className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <CircleSlash className="h-3 w-3 mr-1" />
                          Disconnected
                        </>
                      )}
                    </span>
                    {status.lastActiveFacial && (
                      <span className="ml-2 text-xs text-neutral-500">
                        Last active: {formatTimestamp(status.lastActiveFacial)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Loading status...</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-neutral-50">
              <dt className="text-sm font-medium text-neutral-500">Arduino Status</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2 flex items-center">
                {status ? (
                  <>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.arduinoStatus === "online" 
                        ? "bg-success bg-opacity-10 text-success" 
                        : "bg-error bg-opacity-10 text-error"
                    }`}>
                      {status.arduinoStatus === "online" ? (
                        <>
                          <CircleCheck className="h-3 w-3 mr-1" />
                          Online
                        </>
                      ) : (
                        <>
                          <CircleSlash className="h-3 w-3 mr-1" />
                          Offline
                        </>
                      )}
                    </span>
                    {status.arduinoFirmware && (
                      <span className="ml-2 text-xs text-neutral-500">
                        Firmware: {status.arduinoFirmware}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Loading status...</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-neutral-500">Database Sync</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2 flex items-center">
                {status ? (
                  <>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success bg-opacity-10 text-success">
                      <CircleCheck className="h-3 w-3 mr-1" />
                      Synchronized
                    </span>
                    {status.lastSync && (
                      <span className="ml-2 text-xs text-neutral-500">
                        Last sync: {formatTimestamp(status.lastSync)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Loading status...</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button 
          variant="default" 
          size="sm" 
          onClick={testConnection}
          disabled={isLoading}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Test Connection
        </Button>
        <Button 
          variant="outline" 
          size="sm"

          onClick={calibrateSensors}
          disabled={isCalibrating}
          className="flex items-center"
        >
          <Settings className="h-4 w-4 mr-1" />
          Calibrate Sensors
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BiometricStatus;
