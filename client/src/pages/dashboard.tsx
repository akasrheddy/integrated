import React from "react";
import StatsOverview from "@/components/StatsOverview";
import CandidateManagement from "@/components/CandidateManagement";
import BiometricStatus from "@/components/BiometricStatus";
import BlockchainStatus from "@/components/BlockchainStatus";
import VoterRegistration from "@/components/VoterRegistration";
import VotingInterface from "@/components/VotingInterface";

const Dashboard: React.FC = () => {
  return (
    <div>
      <StatsOverview />
      
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CandidateManagement />
        <BiometricStatus />
        <BlockchainStatus />
        <VoterRegistration />
      </div>
      
      <div className="mt-5">
        <VotingInterface />
      </div>
    </div>
  );
};

export default Dashboard;
