import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Candidate } from "@shared/schema";
import { CheckIcon, Fingerprint, UserCheck } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import BiometricSetup from "@/components/BiometricSetup";

type VotingStep = "verify" | "authenticated" | "voting" | "confirmation";

const VotingInterface: React.FC = () => {
  const [votingStep, setVotingStep] = useState<VotingStep>("verify");
  const [votingTimer, setVotingTimer] = useState(30);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [nftToken, setNftToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Load candidates on component mount
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch("/api/candidates");
        if (response.ok) {
          const data = await response.json();
          setCandidates(data);
        }
      } catch (error) {
        console.error("Failed to fetch candidates:", error);
      }
    };

    fetchCandidates();
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
        submitVote();
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isVoting, votingTimer]);

  const handleBiometricComplete = () => {
    setVotingStep("authenticated");
  };

  const startVoting = () => {
    setVotingStep("voting");
    setIsVoting(true);
    setVotingTimer(30);
  };

  const selectCandidate = (candidateId: number) => {
    setCurrentVote(candidateId);
  };

  const submitVote = async () => {
    if (currentVote === null) return;
    
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/votes/cast",
        { candidateId: currentVote }
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
    setVotingStep("verify");
    setCurrentVote(null);
    setNftToken(null);
    setIsVoting(false);
    setVotingTimer(30);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Active Voting Session</CardTitle>
        <CardDescription>Secure voting with biometric verification and blockchain recording</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto">
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
              <Alert variant="success" className="mb-6">
                <UserCheck className="h-4 w-4" />
                <AlertTitle>Voter Authenticated</AlertTitle>
                <AlertDescription>
                  Identity verified using biometric data and zero-knowledge proof. You can now proceed to vote.
                </AlertDescription>
              </Alert>
              
              <div className="my-6 flex justify-center">
                <Button onClick={startVoting}>
                  Proceed to Voting
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Voting */}
          {votingStep === "voting" && (
            <div>
              {isVoting && (
                <div className="mb-4 bg-primary bg-opacity-10 rounded-md p-4 text-center">
                  <div className="text-lg font-medium text-primary">Time Remaining: {votingTimer} seconds</div>
                  <p className="text-sm text-neutral-600">You can change your vote within this time window. Only the final vote will be recorded.</p>
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
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={submitVote} 
                  disabled={currentVote === null || isLoading}
                >
                  Submit Vote
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
