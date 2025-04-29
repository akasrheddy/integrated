import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimestamp, formatAddress } from "@/lib/utils";
import { Check, Copy, Download, FileText, RefreshCw, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuditRecord {
  id: number;
  type: "vote" | "registration" | "candidate" | "admin";
  timestamp: string;
  description: string;
  transactionHash?: string;
  merkleProof?: string;
  verified: boolean;
}

interface MerkleVerification {
  voterId: string;
  candidateId: number;
  merkleProof: string[];
  verified: boolean;
}

const Audit: React.FC = () => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [merkleVerification, setMerkleVerification] = useState<MerkleVerification | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [voterIdToVerify, setVoterIdToVerify] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditRecords();
  }, []);

  const fetchAuditRecords = async () => {
    try {
      setIsLoadingRecords(true);
      
      const response = await fetch("/api/audit/records");
      if (response.ok) {
        const data = await response.json();
        setAuditRecords(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load audit records",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load audit records",
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const verifyMerkleProof = async () => {
    if (!voterIdToVerify.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a voter ID to verify",
      });
      return;
    }
    
    try {
      setIsVerifying(true);
      setMerkleVerification(null);
      
      const response = await apiRequest(
        "POST",
        "/api/audit/verify-merkle",
        { voterId: voterIdToVerify }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setMerkleVerification(data.verification);
        toast({
          title: data.verification.verified ? "Verification Successful" : "Verification Failed",
          description: data.verification.verified
            ? "The vote has been verified on the blockchain."
            : "The vote verification failed. The vote may have been tampered with.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.message || "Failed to verify the Merkle proof.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "An error occurred during verification.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const generateAuditReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      const response = await apiRequest(
        "POST",
        "/api/audit/generate-report",
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Report Generated",
          description: "The audit report has been generated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Report Generation Failed",
          description: data.message || "Failed to generate the audit report.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Report Generation Error",
        description: "An error occurred during report generation.",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied",
          description: "Text copied to clipboard.",
        });
      },
      (err) => {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy text to clipboard.",
        });
      }
    );
  };

  const filteredRecords = auditRecords.filter(record => 
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.transactionHash && record.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Verify the integrity of the voting process using blockchain and Merkle proofs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="records">
            <TabsList className="mb-4">
              <TabsTrigger value="records">Audit Records</TabsTrigger>
              <TabsTrigger value="merkle">Merkle Verification</TabsTrigger>
            </TabsList>
            
            <TabsContent value="records">
              <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAuditRecords}
                    disabled={isLoadingRecords}
                    className="flex items-center"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateAuditReport}
                    disabled={isGeneratingReport}
                    className="flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Generate Report
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRecords ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Loading audit records...</TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          {searchTerm ? "No matching audit records found." : "No audit records available."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.type === 'vote' 
                                ? 'bg-primary bg-opacity-10 text-primary' 
                                : record.type === 'registration' 
                                  ? 'bg-success bg-opacity-10 text-success'
                                  : record.type === 'candidate'
                                    ? 'bg-amber-500 bg-opacity-10 text-amber-500'
                                    : 'bg-neutral-500 bg-opacity-10 text-neutral-500'
                            }`}>
                              {record.type === 'vote' ? 'Vote' : 
                               record.type === 'registration' ? 'Registration' :
                               record.type === 'candidate' ? 'Candidate' : 'Admin'}
                            </span>
                          </TableCell>
                          <TableCell>{formatTimestamp(record.timestamp)}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                          <TableCell>
                            {record.transactionHash ? (
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs truncate max-w-[120px]">
                                  {formatAddress(record.transactionHash)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(record.transactionHash!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {record.verified ? (
                              <span className="text-success flex items-center">
                                <Check className="h-4 w-4 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="text-neutral-500">Pending</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="merkle">
              <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50 mb-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <label htmlFor="voter-id" className="block text-sm font-medium text-neutral-700 mb-1">
                      Voter ID
                    </label>
                    <Input
                      id="voter-id"
                      placeholder="Enter voter ID to verify their vote"
                      value={voterIdToVerify}
                      onChange={(e) => setVoterIdToVerify(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={verifyMerkleProof}
                    disabled={isVerifying || !voterIdToVerify.trim()}
                    className="flex items-center"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Verify Vote
                  </Button>
                </div>
              </div>
              
              {merkleVerification && (
                <Card>
                  <CardHeader>
                    <CardTitle className={merkleVerification.verified ? "text-success" : "text-error"}>
                      {merkleVerification.verified ? "Vote Verified" : "Verification Failed"}
                    </CardTitle>
                    <CardDescription>
                      Merkle proof verification result for Voter ID: {merkleVerification.voterId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-neutral-500">Voter ID</dt>
                        <dd className="text-sm text-neutral-900 col-span-2">
                          {merkleVerification.voterId}
                        </dd>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-neutral-500">Candidate ID</dt>
                        <dd className="text-sm text-neutral-900 col-span-2">
                          {merkleVerification.candidateId}
                        </dd>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-neutral-500">Merkle Proof</dt>
                        <dd className="text-sm font-mono text-neutral-900 col-span-2 break-all">
                          {merkleVerification.merkleProof.map((proof, index) => (
                            <div key={index} className="mb-1">{proof}</div>
                          ))}
                        </dd>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-neutral-500">Status</dt>
                        <dd className={`text-sm font-medium col-span-2 ${
                          merkleVerification.verified ? "text-success" : "text-error"
                        }`}>
                          {merkleVerification.verified ? "Verified ✓" : "Not Verified ✗"}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Audit;
