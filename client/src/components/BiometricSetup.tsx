import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import Arduino from "@/components/Arduino";
import Webcam from "@/components/ui/webcam";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BiometricSetupProps {
  mode: "registration" | "verification";
  onComplete: (data: { fingerprintHash?: string; facialHash?: string }) => void;
}

const BiometricSetup: React.FC<BiometricSetupProps> = ({ mode, onComplete }) => {
  const [biometricMethod, setBiometricMethod] = useState<"fingerprint" | "facial">("fingerprint");
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [facialData, setFacialData] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFingerprintCaptured = (data: string) => {
    setFingerprintData(data);
    
    // For registration, we just store the fingerprint data
    // For verification, we proceed with ZKP verification
    if (mode === "verification") {
      verifyBiometricData("fingerprint", data);
    } else {
      onComplete({ fingerprintHash: data });
    }
  };

  const handleFacialCapture = async (imageSrc: string) => {
    try {
      setFacialData(imageSrc);
      
      // Process the facial data on the server
      const response = await apiRequest(
        "POST", 
        `/api/facial/${mode === "registration" ? "enroll" : "verify"}`, 
        { facialData: imageSrc }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: mode === "registration" ? "Facial Data Enrolled" : "Facial Identity Verified",
          description: data.message,
        });
        
        if (mode === "verification") {
          verifyBiometricData("facial", data.facialHash);
        } else {
          onComplete({ facialHash: data.facialHash });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Facial Processing Failed",
          description: data.message || "Could not process facial data. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Facial Processing Failed",
        description: "An error occurred while processing the facial data.",
      });
    }
  };

  const verifyBiometricData = async (method: "fingerprint" | "facial", data: string) => {
    try {
      const response = await apiRequest(
        "POST", 
        "/api/zkp/verify", 
        { method, data }
      );
      
      const responseData = await response.json();
      
      if (responseData.verified) {
        toast({
          title: "Identity Verified",
          description: "Your identity has been verified using zero-knowledge proof.",
        });
        
        onComplete({ 
          fingerprintHash: method === "fingerprint" ? data : undefined,
          facialHash: method === "facial" ? data : undefined
        });
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: responseData.message || "Could not verify your identity. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "An error occurred during verification. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "registration" ? "Biometric Registration" : "Biometric Verification"}
        </CardTitle>
        <CardDescription>
          {mode === "registration" 
            ? "Register your biometric data for secure voting" 
            : "Verify your identity with your registered biometric data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Zero-Knowledge Authentication</AlertTitle>
          <AlertDescription>
            Your biometric data is processed securely using Zero-Knowledge Proofs. 
            This means your identity can be verified without revealing your actual biometric data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="fingerprint" onValueChange={(value) => setBiometricMethod(value as "fingerprint" | "facial")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fingerprint">Fingerprint</TabsTrigger>
            <TabsTrigger value="facial">Facial Recognition</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fingerprint">
            <Arduino 
              mode={mode} 
              onFingerprintCaptured={handleFingerprintCaptured} 
            />
          </TabsContent>
          
          <TabsContent value="facial">
            <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Facial Recognition</h3>
              <p className="mb-4 text-sm text-neutral-500">
                {mode === "registration" 
                  ? "Position your face in the frame and capture your image to register" 
                  : "Position your face in the frame to verify your identity"}
              </p>
              
              <Webcam 
                width={640}
                height={480}
                onCapture={handleFacialCapture}
                className="mx-auto max-w-md"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BiometricSetup;
