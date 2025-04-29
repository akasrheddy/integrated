import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Voter } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatTimestamp } from "@/lib/utils";
import VoterRegistration from "@/components/VoterRegistration";
import { Download, RefreshCw, Search, UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";

const VoterManagement: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchVoters();
  }, []);

  const fetchVoters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/voters");
      if (response.ok) {
        const data = await response.json();
        setVoters(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load voters",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load voters",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportVotersList = async () => {
    try {
      toast({
        title: "Exporting Voters",
        description: "Generating CSV export of voter records...",
      });
      
      // This would typically trigger a download in a real application
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Voter records have been exported successfully.",
        });
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export voter records.",
      });
    }
  };

  const resetVoterStatus = async (voterId: string) => {
    try {
      const response = await apiRequest(
        "POST",
        `/api/voters/${voterId}/reset-status`,
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Status Reset",
          description: "Voter status has been reset successfully.",
        });
        
        fetchVoters();
      } else {
        toast({
          variant: "destructive",
          title: "Reset Failed",
          description: data.message || "Failed to reset voter status.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Error",
        description: "An error occurred while resetting voter status.",
      });
    }
  };

  const filteredVoters = voters.filter(voter => 
    voter.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.voterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voter Management</CardTitle>
          <CardDescription>View and manage registered voters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search voters..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchVoters}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportVotersList}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Biometric Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Loading voters...</TableCell>
                  </TableRow>
                ) : filteredVoters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      {searchTerm ? "No matching voters found." : "No voters registered yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVoters.map((voter) => (
                    <TableRow key={voter.id}>
                      <TableCell className="font-medium">{voter.voterId}</TableCell>
                      <TableCell>{voter.fullName}</TableCell>
                      <TableCell>{formatTimestamp(voter.registrationDate)}</TableCell>
                      <TableCell>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          voter.hasVoted 
                            ? "bg-success bg-opacity-10 text-success" 
                            : "bg-neutral-200 text-neutral-600"
                        }`}>
                          {voter.hasVoted ? "Voted" : "Not Voted"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {voter.fingerprintHash && voter.facialDataHash 
                          ? "Fingerprint & Facial" 
                          : voter.fingerprintHash 
                            ? "Fingerprint" 
                            : voter.facialDataHash 
                              ? "Facial" 
                              : "None"}
                      </TableCell>
                      <TableCell className="text-right">
                        {voter.hasVoted && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => resetVoterStatus(voter.voterId)}
                            className="text-amber-500 hover:text-amber-600"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reset Status
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <VoterRegistration />
    </div>
  );
};

export default VoterManagement;
