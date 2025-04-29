import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVoterSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import BiometricSetup from "@/components/BiometricSetup";

// Extend the voter schema with custom validation
const voterFormSchema = insertVoterSchema.extend({
  voterId: z.string().min(5, "Voter ID must be at least 5 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

type VoterFormValues = z.infer<typeof voterFormSchema>;

const VoterRegistration: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    defaultValues: {
      voterId: "",
      fullName: "",
      dateOfBirth: "",
      address: "",
    },
  });

  const onSubmitVoterInfo = (values: VoterFormValues) => {
    // Proceed to biometric registration
    setStep(2);
  };

  const handleBiometricComplete = async (biometricData: { fingerprintHash?: string; facialHash?: string }) => {
    try {
      setIsRegistering(true);
      
      // Get the voter information from the form
      const voterInfo = form.getValues();
      
      // Submit the complete registration data
      const response = await apiRequest(
        "POST",
        "/api/voters/register",
        {
          ...voterInfo,
          fingerprintHash: biometricData.fingerprintHash,
          facialDataHash: biometricData.facialHash,
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Registration Successful",
          description: "The voter has been registered successfully.",
        });
        
        // Reset the form and go back to step 1
        form.reset();
        setStep(1);
        
        // Invalidate the voters query to refresh any lists
        queryClient.invalidateQueries({ queryKey: ["/api/voters"] });
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: data.message || "Failed to register the voter. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: "An error occurred during registration. Please try again.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Voter Registration</CardTitle>
        <CardDescription>Register new voters with biometric data</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Registration Guidelines</AlertTitle>
          <AlertDescription>
            <p>Ensure the following for proper biometric registration:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Clean fingerprint sensor before each scan</li>
              <li>Proper lighting for facial recognition</li>
              <li>Verify ID documents before proceeding</li>
              <li>Complete all ZKP authentication steps</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="mb-6">
          <div className="flex items-center">
            <div 
              className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                step >= 1 ? "bg-primary text-white" : "bg-neutral-200 text-neutral-400"
              }`}
            >
              1
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-sm font-medium ${step >= 1 ? "text-primary" : "text-neutral-500"}`}>
                Voter Information
              </h3>
            </div>
            <div 
              className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ml-8 ${
                step >= 2 ? "bg-primary text-white" : "bg-neutral-200 text-neutral-400"
              }`}
            >
              2
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-sm font-medium ${step >= 2 ? "text-primary" : "text-neutral-500"}`}>
                Biometric Enrollment
              </h3>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-neutral-200 mt-3">
            <div 
              className={`bg-primary transition-all duration-500 ease-out ${
                step === 1 ? "w-1/2" : "w-full"
              }`}
            ></div>
          </div>
        </div>

        {step === 1 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitVoterInfo)} className="space-y-4">
              <FormField
                control={form.control}
                name="voterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voter ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter unique voter ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique identifier for the voter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter voter's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter voter's address" 
                        className="resize-none" 
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-2">
                <Button type="submit">
                  Continue to Biometrics
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <BiometricSetup 
            mode="registration" 
            onComplete={handleBiometricComplete} 
          />
        )}
      </CardContent>
      {step === 2 && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setStep(1)}
            disabled={isRegistering}
          >
            Back
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default VoterRegistration;
