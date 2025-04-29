import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import VoterManagement from "@/pages/voter-management";
import CandidateManagementPage from "@/pages/candidate-management";
import VotingStatus from "@/pages/voting-status";
import Results from "@/pages/results";
import Audit from "@/pages/audit";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/voter-management" component={VoterManagement} />
      <Route path="/candidate-management" component={CandidateManagementPage} />
      <Route path="/voting-status" component={VotingStatus} />
      <Route path="/results" component={Results} />
      <Route path="/audit" component={Audit} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
