import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ArduinoProps {
  onFingerprintCaptured?: (data: string) => void;
  mode: "registration" | "verification";
}

const Arduino: React.FC<ArduinoProps> = ({ onFingerprintCaptured, mode }) => {
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "scanning" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const connectToArduino = async () => {
    setStatus("connecting");
    
    try {
      const response = await apiRequest("POST", "/api/arduino/connect", {});
      const data = await response.json();
      
      if (data.connected) {
        setStatus("ready");
        toast({
          title: "Arduino Connected",
          description: "Fingerprint scanner is ready to use.",
        });
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Failed to connect to Arduino");
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: data.message || "Could not connect to the fingerprint scanner.",
        });
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to connect to Arduino");
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Could not connect to the Arduino. Please check the hardware setup.",
      });
    }
  };

  const scanFingerprint = async () => {
    if (status !== "ready") return;
    
    setStatus("scanning");
    
    try {
      const endpoint = mode === "registration" 
        ? "/api/arduino/enroll-fingerprint" 
        : "/api/arduino/verify-fingerprint";
      
      const response = await apiRequest("POST", endpoint, {});
      const data = await response.json();
      
      if (data.success) {
        setStatus("complete");
        
        if (onFingerprintCaptured) {
          onFingerprintCaptured(data.fingerprintData);
        }
        
        toast({
          title: mode === "registration" ? "Fingerprint Enrolled" : "Fingerprint Verified",
          description: data.message || "Fingerprint process completed successfully.",
        });
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Fingerprint scan failed");
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: data.message || "Could not scan fingerprint. Please try again.",
        });
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to scan fingerprint");
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Could not scan fingerprint. Please try again.",
      });
    }
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {mode === "registration" ? "Fingerprint Enrollment" : "Fingerprint Verification"}
        </CardTitle>
        <CardDescription>
          {mode === "registration" 
            ? "Register a new fingerprint for secure voter identification" 
            : "Verify voter identity using fingerprint"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center p-6 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50">
          <div className="mx-auto h-24 w-24 text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"></path>
              <path d="M6 11c0-3.31 2.69-6 6-6s6 2.69 6 6h-2c0-2.21-1.79-4-4-4s-4 1.79-4 4H6z"></path>
              <path d="M6 11c0 3.31 2.69 6 6 6s6-2.69 6-6h-2c0 2.21-1.79 4-4 4s-4-1.79-4-4H6z"></path>
              <path d="M5 11c0-3.86 3.14-7 7-7s7 3.14 7 7h-2c0-2.76-2.24-5-5-5s-5 2.24-5 5H5z"></path>
            </svg>
          </div>
          
          <h3 className="mt-2 text-sm font-medium text-neutral-900">
            {status === "idle" && "Connect to Fingerprint Scanner"}
            {status === "connecting" && "Connecting..."}
            {status === "ready" && "Ready to Scan"}
            {status === "scanning" && "Scanning..."}
            {status === "complete" && (mode === "registration" ? "Enrollment Complete" : "Verification Complete")}
            {status === "error" && "Error"}
          </h3>
          
          <p className="mt-1 text-sm text-neutral-500">
            {status === "idle" && "Connect to the Arduino R307 fingerprint scanner to begin"}
            {status === "connecting" && "Establishing connection to the Arduino..."}
            {status === "ready" && "Place finger on the scanner to proceed"}
            {status === "scanning" && "Keep finger on scanner until process completes"}
            {status === "complete" && (
              mode === "registration" 
                ? "Fingerprint has been securely enrolled with a salted hash" 
                : "Identity has been verified using zero-knowledge proof"
            )}
            {status === "error" && errorMessage}
          </p>
          
          <div className="mt-4">
            {status === "idle" && (
              <Button onClick={connectToArduino}>
                Connect Scanner
              </Button>
            )}
            
            {status === "ready" && (
              <Button onClick={scanFingerprint}>
                Start {mode === "registration" ? "Enrollment" : "Verification"}
              </Button>
            )}
            
            {(status === "complete" || status === "error") && (
              <Button onClick={reset} variant="outline">
                {status === "complete" ? "Done" : "Try Again"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Arduino;
