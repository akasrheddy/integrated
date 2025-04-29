import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Users, UserPlus, Shield } from "lucide-react";

interface StatsData {
  registeredVoters: number;
  totalVotesCast: number;
  activeCandidates: number;
  blockConfirmations: number;
}

const StatsOverview: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    registeredVoters: 0,
    totalVotesCast: 0,
    activeCandidates: 0,
    blockConfirmations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load stats",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load stats",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary rounded-md p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Registered Voters</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-neutral-900">
                    {isLoading ? "Loading..." : stats.registeredVoters.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-secondary rounded-md p-3">
              <Fingerprint className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Total Votes Cast</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-neutral-900">
                    {isLoading ? "Loading..." : stats.totalVotesCast.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Active Candidates</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-neutral-900">
                    {isLoading ? "Loading..." : stats.activeCandidates}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">Block Confirmations</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-neutral-900">
                    {isLoading ? "Loading..." : stats.blockConfirmations.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsOverview;
