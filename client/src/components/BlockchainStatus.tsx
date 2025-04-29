import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BlockchainStatus as BlockchainStatusType } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { CircleCheck, Database, File, FileText, RefreshCw } from "lucide-react";
import { formatTimestamp, formatAddress } from "@/lib/utils";

const BlockchainStatus: React.FC = () => {
  const [status, setStatus] = useState<BlockchainStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockchainStatus();
  }, []);

  const fetchBlockchainStatus = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/blockchain/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch blockchain status",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch blockchain status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewTransactions = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/blockchain/transactions");
      
      if (response.ok) {
        const data = await response.json();
        
        // In a real app, you might open a modal or navigate to a transactions page
        toast({
          title: "Transactions Loaded",
          description: `Successfully loaded ${data.transactions?.length || 0} transactions.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load blockchain transactions",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load blockchain transactions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAuditReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      const response = await apiRequest(
        "POST",
        "/api/blockchain/generate-audit",
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Audit Report Generated",
          description: data.message || "Audit report has been generated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Report Generation Failed",
          description: data.message || "Failed to generate audit report.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Report Generation Error",
        description: "An error occurred while generating the audit report.",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Blockchain Status</CardTitle>
        <CardDescription>Private and public ledger information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-t border-neutral-200">
          <dl>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-neutral-50">
              <dt className="text-sm font-medium text-neutral-500">Network Status</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2 flex items-center">
                {status ? (
                  <>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.networkStatus === "connected" 
                        ? "bg-success bg-opacity-10 text-success" 
                        : "bg-error bg-opacity-10 text-error"
                    }`}>
                      {status.networkStatus === "connected" ? (
                        <>
                          <CircleCheck className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        "Disconnected"
                      )}
                    </span>
                    {status.activeNodes && (
                      <span className="ml-2 text-xs text-neutral-500">
                        {status.activeNodes} nodes active
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Loading status...</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-neutral-500">Latest Block</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">
                {status && status.latestBlockNumber ? (
                  <>
                    <div>#{status.latestBlockNumber} ({status.lastUpdated && formatTimestamp(status.lastUpdated)})</div>
                    {status.latestBlockHash && (
                      <div className="mt-1">
                        <span className="font-mono text-xs text-neutral-500 break-all">{status.latestBlockHash}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">No block information available</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-neutral-50">
              <dt className="text-sm font-medium text-neutral-500">Smart Contract</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">
                {status && status.smartContractAddress ? (
                  <>
                    <div>Election Smart Contract: <span className="text-success">Deployed</span></div>
                    <div className="mt-1">
                      <span className="font-mono text-xs text-neutral-500 break-all">{status.smartContractAddress}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">No smart contract deployed</span>
                )}
              </dd>
            </div>
            
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-neutral-500">Merkle Tree</dt>
              <dd className="mt-1 text-sm text-neutral-900 sm:mt-0 sm:col-span-2">
                {status && status.merkleRootHash ? (
                  <>
                    <div>Root Hash: <span className="font-mono text-xs break-all">{status.merkleRootHash}</span></div>
                    {status.lastUpdated && (
                      <div className="mt-1 text-xs text-neutral-500">Last updated: {formatTimestamp(status.lastUpdated)}</div>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">No Merkle tree information available</span>
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
          onClick={viewTransactions}
          disabled={isLoading}
          className="flex items-center"
        >
          <Database className="h-4 w-4 mr-1" />
          View Transactions
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={generateAuditReport}
          disabled={isGeneratingReport}
          className="flex items-center"
        >
          <FileText className="h-4 w-4 mr-1" />
          Generate Audit Report
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BlockchainStatus;
