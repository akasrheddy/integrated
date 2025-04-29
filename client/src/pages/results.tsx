import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CandidateResult {
  id: number;
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

const COLORS = ['#3949ab', '#00acc1', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#3f51b5', '#009688'];

const Results: React.FC = () => {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/votes/results");
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setTotalVotes(data.totalVotes);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load voting results",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load voting results",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportResults = async () => {
    try {
      toast({
        title: "Exporting Results",
        description: "Generating export of election results...",
      });
      
      // This would typically trigger a download in a real application
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Election results have been exported successfully.",
        });
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export election results.",
      });
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Election Results</CardTitle>
          <CardDescription>
            {isLoading 
              ? "Loading election results..." 
              : `Total votes cast: ${totalVotes}`}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchResults}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportResults}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <p>Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex justify-center items-center h-80">
            <p>No votes have been cast yet.</p>
          </div>
        ) : (
          <Tabs defaultValue="chart">
            <TabsList className="mb-4">
              <TabsTrigger value="chart">Chart View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <h3 className="text-base font-medium mb-2 text-center">Pie Chart</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={results}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="votes"
                      >
                        {results.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value} votes`, 'Votes']}
                        labelFormatter={(name) => {
                          const candidate = results.find(r => r.id === name);
                          return candidate ? `${candidate.name} (${candidate.party})` : '';
                        }}
                      />
                      <Legend 
                        formatter={(value, entry, index) => {
                          const candidate = results[index];
                          return `${candidate.name} (${candidate.party})`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="h-80">
                  <h3 className="text-base font-medium mb-2 text-center">Bar Chart</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={results}
                      margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} votes`, 'Votes']}
                        labelFormatter={(name) => {
                          const candidate = results.find(r => r.name === name);
                          return candidate ? `${candidate.name} (${candidate.party})` : '';
                        }}
                      />
                      <Bar dataKey="votes" fill="#3949ab" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="table">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border px-4 py-2 text-left">Rank</th>
                      <th className="border px-4 py-2 text-left">Candidate</th>
                      <th className="border px-4 py-2 text-left">Party</th>
                      <th className="border px-4 py-2 text-right">Votes</th>
                      <th className="border px-4 py-2 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={result.id} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                        <td className="border px-4 py-2">{index + 1}</td>
                        <td className="border px-4 py-2 font-medium">{result.name}</td>
                        <td className="border px-4 py-2">{result.party}</td>
                        <td className="border px-4 py-2 text-right">{result.votes}</td>
                        <td className="border px-4 py-2 text-right">{result.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary bg-opacity-10">
                      <td colSpan={3} className="border px-4 py-2 text-right font-medium">Total</td>
                      <td className="border px-4 py-2 text-right font-medium">{totalVotes}</td>
                      <td className="border px-4 py-2 text-right font-medium">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default Results;
