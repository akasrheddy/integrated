import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Candidate } from "@shared/schema";
import { CheckIcon, Fingerprint, UserCheck, UserIcon } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import BiometricSetup from "@/components/BiometricSetup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VotingStep = "select-voter" | "verify" | "authenticated" | "voting" | "confirmation";

const VotingInterface: React.FC = () => {
  const [votingStep, setVotingStep] = useState<VotingStep>("select-voter");
  const [votingTimer, setVotingTimer] = useState(30);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [nftToken, setNftToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingBlockchain, setIsConnectingBlockchain] = useState(false);
  const [confirmationTimer, setConfirmationTimer] = useState(0);
  const [isConfirmationMode, setIsConfirmationMode] = useState(false);
  const [voters, setVoters] = useState<Array<{ id: number; voterId: string; fullName: string; hasVoted: boolean | null }>>([]);
  const [selectedVoterId, setSelectedVoterId] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Load candidates and voters on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch candidates
        const candidatesResponse = await fetch("/api/candidates");
        if (candidatesResponse.ok) {
          const candidatesData = await candidatesResponse.json();
          setCandidates(candidatesData);
        }
        
        // Fetch voters
        const votersResponse = await fetch("/api/voters");
        if (votersResponse.ok) {
          const votersData = await votersResponse.json();
          setVoters(votersData);
          
          // Set default voter if available
          if (votersData.length > 0) {
            const availableVoter = votersData.find((v: any) => !v.hasVoted);
            if (availableVoter) {
              setSelectedVoterId(availableVoter.voterId);
            } else if (votersData.length > 0) {
              setSelectedVoterId(votersData[0].voterId);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  // Timer effect for voting window
  useEffect(() => {
    if (isVoting && votingTimer > 0) {
      timerRef.current = setTimeout(() => {
        setVotingTimer(prev => prev - 1);
      }, 1000);
    } else if (votingTimer === 0 && isVoting) {
      // Time's up, submit the vote if one is selected
      if (currentVote !== null) {
        submitFinalVote();
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVoting, votingTimer, currentVote]);
  
  // Timer effect for confirmation window after submit clicked
  useEffect(() => {
    if (isConfirmationMode && confirmationTimer > 0) {
      timerRef.current = setTimeout(() => {
        setConfirmationTimer(prev => prev - 1);
      }, 1000);
    } else if (confirmationTimer === 0 && isConfirmationMode) {
      // Time's up, confirm the vote
      finalizeFinalVote();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isConfirmationMode, confirmationTimer]);

  const handleBiometricComplete = () => {
    setVotingStep("authenticated");
  };

  const connectBlockchain = async () => {
    try {
      setIsConnectingBlockchain(true);
      
      const response = await apiRequest(
        "POST",
        "/api/blockchain/connect",
        {}
      );
      
      const data = await response.json();
      
      if (data.connected) {
        toast({
          title: "Blockchain Connected",
          description: `${data.message}`,
        });
        startVoting();
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: data.message || "Failed to connect to blockchain. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "An error occurred while connecting to the blockchain. Please try again.",
      });
    } finally {
      setIsConnectingBlockchain(false);
    }
  };

  const startVoting = () => {
    setVotingStep("voting");
    setIsVoting(true);
    setVotingTimer(30);
  };

  const selectCandidate = (candidateId: number) => {
    setCurrentVote(candidateId);
  };

  const submitVote = () => {
    if (currentVote === null || !selectedVoterId) {
      toast({
        variant: "destructive",
        title: "Voting Error",
        description: "Please select both a voter ID and a candidate.",
      });
      return;
    }
    
    // Start the confirmation timer
    setConfirmationTimer(15);
    setIsConfirmationMode(true);
    
    toast({
      title: "Confirm Your Vote",
      description: "You have 15 seconds to change your vote before final submission.",
    });
  };
  
  const cancelVote = () => {
    // Cancel the confirmation timer
    setIsConfirmationMode(false);
    setConfirmationTimer(0);
    
    toast({
      title: "Vote Cancelled",
      description: "You can continue selecting a candidate.",
    });
  };
  
  const submitFinalVote = () => {
    if (isConfirmationMode) {
      finalizeFinalVote();
    } else {
      submitVote();
    }
  };
  
  const finalizeFinalVote = async () => {
    if (currentVote === null || !selectedVoterId) {
      toast({
        variant: "destructive",
        title: "Voting Error",
        description: "Please select both a voter ID and a candidate.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setIsConfirmationMode(false);
      
      const response = await apiRequest(
        "POST",
        "/api/votes/cast",
        { 
          candidateId: currentVote,
          voterId: selectedVoterId
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setNftToken(data.nftTokenId);
        setVotingStep("confirmation");
        setIsVoting(false);
        
        toast({
          title: "Vote Recorded",
          description: "Your vote has been securely recorded on the blockchain.",
        });
        
        // Invalidate votes query to refresh any results
        queryClient.invalidateQueries({ queryKey: ["/api/votes"] });
        
        // Update the local voters list to mark this voter as having voted
        setVoters(prev => prev.map(voter => 
          voter.voterId === selectedVoterId ? { ...voter, hasVoted: true } : voter
        ));
      } else {
        toast({
          variant: "destructive",
          title: "Voting Failed",
          description: data.message || "Failed to record your vote. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Voting Error",
        description: "An error occurred while submitting your vote. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetVoting = () => {
    setVotingStep("select-voter");
    setCurrentVote(null);
    setNftToken(null);
    setIsVoting(false);
    setVotingTimer(30);
    setSelectedVoterId("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Active Voting Session</CardTitle>
        <CardDescription>Secure voting with biometric verification and blockchain recording</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto">
          {/* Step: Select Voter */}
          {votingStep === "select-voter" && (
            <div>
              <Alert className="mb-6">
                <UserIcon className="h-4 w-4" />
                <AlertTitle>Voter Selection</AlertTitle>
                <AlertDescription>
                  Please select your Voter ID to begin the authentication process.
                </AlertDescription>
              </Alert>
              
              <div className="mb-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voterIdSelect">Select Your Voter ID</Label>
                  <select 
                    id="voterIdSelect"
                    className="w-full p-2 border border-neutral-300 rounded-md"
                    value={selectedVoterId}
                    onChange={(e) => setSelectedVoterId(e.target.value)}
                  >
                    <option value="">Select a Voter ID</option>
                    {voters.map(voter => (
                      <option 
                        key={voter.id} 
                        value={voter.voterId}
                        disabled={voter.hasVoted === true}
                      >
                        {voter.voterId} - {voter.fullName} {voter.hasVoted === true ? "(Already Voted)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2">
                  {selectedVoterId ? (
                    <div className="text-sm text-neutral-600 mb-4">
                      You selected: <span className="font-semibold">{selectedVoterId}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 mb-4">
                      Please select a Voter ID to continue
                    </div>
                  )}
                </div>
              </div>
              
              <div className="my-6 flex justify-center">
                <Button 
                  onClick={() => setVotingStep("verify")}
                  disabled={!selectedVoterId}
                >
                  Proceed to Biometric Verification
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Voter Verification */}
          {votingStep === "verify" && (
            <BiometricSetup 
              mode="verification" 
              onComplete={handleBiometricComplete} 
            />
          )}
          
          {/* Step: Authenticated */}
          {votingStep === "authenticated" && (
            <div>
              <Alert className="mb-6">
                <UserCheck className="h-4 w-4" />
                <AlertTitle>Voter Authenticated</AlertTitle>
                <AlertDescription>
                  Identity verified using biometric data and zero-knowledge proof.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 mb-6 border border-green-200 bg-green-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Fingerprint className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">Biometric Authentication Successful</h3>
                    <p className="text-sm text-green-600">You are verified as <span className="font-semibold">{selectedVoterId}</span></p>
                  </div>
                </div>
              </div>
              
              <div className="my-6 flex justify-center">
                <Button 
                  onClick={connectBlockchain}
                  disabled={!selectedVoterId || isConnectingBlockchain}
                >
                  {isConnectingBlockchain ? (
                    <>
                      <span className="animate-pulse mr-2">●</span>
                      Connecting to Blockchain...
                    </>
                  ) : (
                    "Connect and Proceed to Voting"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Voting */}
          {votingStep === "voting" && (
            <div>
              {isVoting && !isConfirmationMode && (
                <div className="mb-4 bg-primary bg-opacity-10 rounded-md p-4 text-center">
                  <div className="text-lg font-medium text-primary">Time Remaining: {votingTimer} seconds</div>
                  <p className="text-sm text-neutral-600">You can change your vote within this time window. Only the final vote will be recorded.</p>
                </div>
              )}
              
              {isConfirmationMode && (
                <div className="mb-4 bg-red-500 bg-opacity-10 rounded-md p-4 text-center border border-red-500">
                  <div className="text-lg font-medium text-red-600">Confirmation Time: {confirmationTimer} seconds</div>
                  <p className="text-sm text-red-600 font-semibold">You can still change your vote before final submission!</p>
                </div>
              )}
              
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Select Your Candidate</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id}
                    onClick={() => selectCandidate(candidate.id)}
                    className={`border rounded-lg p-4 cursor-pointer flex items-center transition-all ${
                      currentVote === candidate.id 
                        ? "border-primary bg-primary bg-opacity-10" 
                        : "border-neutral-200 hover:border-primary"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full bg-neutral-200 flex items-center justify-center mr-4">
                      <UserCheck className="h-6 w-6 text-neutral-600" />
                    </div>
                    <div>
                      <div className="text-base font-medium">{candidate.name}</div>
                      <div className="text-sm text-neutral-500">{candidate.party}</div>
                    </div>
                    {currentVote === candidate.id && (
                      <div className="ml-auto">
                        <CheckIcon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {isConfirmationMode && (
                  <Button 
                    variant="outline" 
                    onClick={cancelVote}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button 
                  onClick={isConfirmationMode ? finalizeFinalVote : submitVote} 
                  disabled={currentVote === null || isLoading}
                  variant={isConfirmationMode ? "destructive" : "default"}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-pulse mr-2">●</span>
                      Recording Vote...
                    </>
                  ) : isConfirmationMode ? (
                    "Confirm Final Vote"
                  ) : (
                    "Submit Vote"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Confirmation */}
          {votingStep === "confirmation" && (
            <div className="p-6 border border-success border-opacity-25 bg-success bg-opacity-5 rounded-lg text-center">
              <div className="mx-auto h-16 w-16 text-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-success">Vote Successfully Recorded</h3>
              <p className="mt-2 text-sm text-neutral-700">
                Your vote has been anonymously recorded on the blockchain using blind signature technology.
              </p>
              {nftToken && (
                <div className="mt-4 px-4 py-2 bg-neutral-100 rounded-md inline-block">
                  <span className="font-mono text-xs text-neutral-700 break-all">NFT Token ID: {nftToken}</span>
                </div>
              )}
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={resetVoting}
                >
                  New Voter Session
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VotingInterface;
