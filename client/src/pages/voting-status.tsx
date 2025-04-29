import React from "react";
import VotingInterface from "@/components/VotingInterface";
import BiometricStatus from "@/components/BiometricStatus";

const VotingStatus: React.FC = () => {
  return (
    <div className="space-y-6">
      <BiometricStatus />
      <VotingInterface />
    </div>
  );
};

export default VotingStatus;
