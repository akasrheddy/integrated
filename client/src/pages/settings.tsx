import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const arduinoSettingsSchema = z.object({
  serialPort: z.string().min(1, "Serial port is required"),
  baudRate: z.coerce.number().int().positive("Baud rate must be a positive integer"),
  timeout: z.coerce.number().int().positive("Timeout must be a positive integer"),
  autoConnect: z.boolean(),
});

const blockchainSettingsSchema = z.object({
  provider: z.string().min(1, "Provider URL is required"),
  contractAddress: z.string().min(1, "Contract address is required"),
  privateKey: z.string().min(1, "Private key is required"),
  gasLimit: z.coerce.number().int().positive("Gas limit must be a positive integer"),
  autoSync: z.boolean(),
});

const systemSettingsSchema = z.object({
  votingWindowDuration: z.coerce.number().int().positive("Voting window duration must be a positive integer"),
  zkpEnabled: z.boolean(),
  blindSignaturesEnabled: z.boolean(),
  nftIssuanceEnabled: z.boolean(),
  adminEmail: z.string().email("Invalid email address"),
});

type ArduinoSettingsValues = z.infer<typeof arduinoSettingsSchema>;
type BlockchainSettingsValues = z.infer<typeof blockchainSettingsSchema>;
type SystemSettingsValues = z.infer<typeof systemSettingsSchema>;

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState("arduino");
  const [isRestarting, setIsRestarting] = useState(false);
  const { toast } = useToast();

  const arduinoForm = useForm<ArduinoSettingsValues>({
    resolver: zodResolver(arduinoSettingsSchema),
    defaultValues: {
      serialPort: "/dev/ttyUSB0",
      baudRate: 57600,
      timeout: 5000,
      autoConnect: true,
    },
  });

  const blockchainForm = useForm<BlockchainSettingsValues>({
    resolver: zodResolver(blockchainSettingsSchema),
    defaultValues: {
      provider: "https://mainnet.infura.io/v3/",
      contractAddress: "0x0000000000000000000000000000000000000000",
      privateKey: "",
      gasLimit: 3000000,
      autoSync: true,
    },
  });

  const systemForm = useForm<SystemSettingsValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      votingWindowDuration: 30,
      zkpEnabled: true,
      blindSignaturesEnabled: true,
      nftIssuanceEnabled: true,
      adminEmail: "admin@example.com",
    },
  });

  useEffect(() => {
    // Load settings from the server
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          
          // Update form values
          if (data.arduino) {
            arduinoForm.reset(data.arduino);
          }
          
          if (data.blockchain) {
            blockchainForm.reset(data.blockchain);
          }
          
          if (data.system) {
            systemForm.reset(data.system);
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load settings",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load settings",
        });
      }
    };

    fetchSettings();
  }, []);

  const onSubmitArduinoSettings = async (values: ArduinoSettingsValues) => {
    try {
      const response = await apiRequest(
        "PATCH",
        "/api/settings/arduino",
        values
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Settings Saved",
          description: "Arduino settings have been updated successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: data.message || "Failed to save Arduino settings.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An error occurred while saving Arduino settings.",
      });
    }
  };

  const onSubmitBlockchainSettings = async (values: BlockchainSettingsValues) => {
    try {
      const response = await apiRequest(
        "PATCH",
        "/api/settings/blockchain",
        values
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Settings Saved",
          description: "Blockchain settings have been updated successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: data.message || "Failed to save blockchain settings.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An error occurred while saving blockchain settings.",
      });
    }
  };

  const onSubmitSystemSettings = async (values: SystemSettingsValues) => {
    try {
      const response = await apiRequest(
        "PATCH",
        "/api/settings/system",
        values
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Settings Saved",
          description: "System settings have been updated successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: data.message || "Failed to save system settings.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An error occurred while saving system settings.",
      });
    }
  };

  const restartSystem = async () => {
    try {
      setIsRestarting(true);
      
      const response = await apiRequest(
        "POST",
        "/api/system/restart",
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "System Restarting",
          description: "The system is now restarting. This may take a moment.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Restart Failed",
          description: data.message || "Failed to restart the system.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Restart Error",
        description: "An error occurred while restarting the system.",
      });
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure and manage the voting system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="arduino" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="arduino">Arduino & Biometrics</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            
            <TabsContent value="arduino">
              <Form {...arduinoForm}>
                <form onSubmit={arduinoForm.handleSubmit(onSubmitArduinoSettings)} className="space-y-4">
                  <Alert variant="warning" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Arduino Configuration</AlertTitle>
                    <AlertDescription>
                      These settings control the connection to the R307 fingerprint sensor via Arduino.
                      Incorrect settings may prevent the system from communicating with the hardware.
                    </AlertDescription>
                  </Alert>
                  
                  <FormField
                    control={arduinoForm.control}
                    name="serialPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Port</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., /dev/ttyUSB0 or COM3" {...field} />
                        </FormControl>
                        <FormDescription>
                          The port where the Arduino is connected
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={arduinoForm.control}
                    name="baudRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baud Rate</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Communication speed with the Arduino (typically 57600)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={arduinoForm.control}
                    name="timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Connection Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          How long to wait before timing out a connection attempt
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={arduinoForm.control}
                    name="autoConnect"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-Connect</FormLabel>
                          <FormDescription>
                            Automatically connect to the Arduino on system startup
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-1" />
                      Save Arduino Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="blockchain">
              <Form {...blockchainForm}>
                <form onSubmit={blockchainForm.handleSubmit(onSubmitBlockchainSettings)} className="space-y-4">
                  <Alert variant="warning" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Blockchain Configuration</AlertTitle>
                    <AlertDescription>
                      These settings control the connection to the blockchain network and smart contract.
                      Keep your private key secure and never share it with others.
                    </AlertDescription>
                  </Alert>
                  
                  <FormField
                    control={blockchainForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider URL</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., https://mainnet.infura.io/v3/your_project_id" {...field} />
                        </FormControl>
                        <FormDescription>
                          The blockchain provider endpoint
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={blockchainForm.control}
                    name="contractAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Smart Contract Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormDescription>
                          The deployed election smart contract address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={blockchainForm.control}
                    name="privateKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Private Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your private key (kept secure)" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used to sign transactions (keep this secure!)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={blockchainForm.control}
                    name="gasLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Limit</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Maximum gas to use for transactions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={blockchainForm.control}
                    name="autoSync"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-Sync</FormLabel>
                          <FormDescription>
                            Automatically sync with the blockchain
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-1" />
                      Save Blockchain Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="system">
              <Form {...systemForm}>
                <form onSubmit={systemForm.handleSubmit(onSubmitSystemSettings)} className="space-y-4">
                  <Alert variant="warning" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>System Configuration</AlertTitle>
                    <AlertDescription>
                      These settings control the core behavior of the voting system.
                      Changing these settings may affect the security and operation of the system.
                    </AlertDescription>
                  </Alert>
                  
                  <FormField
                    control={systemForm.control}
                    name="votingWindowDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voting Window Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Time allowed for a voter to change their vote (only the last vote counts)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="zkpEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Zero-Knowledge Proofs</FormLabel>
                          <FormDescription>
                            Enable ZKP for secure voter authentication without revealing personal data
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="blindSignaturesEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Blind Signatures</FormLabel>
                          <FormDescription>
                            Enable blind signatures for anonymous vote verification
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="nftIssuanceEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">NFT Issuance</FormLabel>
                          <FormDescription>
                            Issue NFT tokens as a receipt for votes
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={systemForm.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormDescription>
                          Email for system notifications and alerts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-1" />
                      Save System Settings
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <div className="w-full flex justify-between">
            <Button 
              variant="destructive" 
              onClick={restartSystem}
              disabled={isRestarting}
            >
              {isRestarting ? "Restarting..." : "Restart System"}
            </Button>
            <div className="text-xs text-neutral-500">
              System Version: 1.0.0 | Database: In-Memory | Last Updated: {new Date().toLocaleString()}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Settings;
