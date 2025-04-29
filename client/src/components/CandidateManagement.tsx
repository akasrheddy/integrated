import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Candidate } from "@shared/schema";
import { Plus, UserIcon, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Extend the candidate schema with custom validation
const candidateFormSchema = insertCandidateSchema.extend({
  name: z.string().min(3, "Name must be at least 3 characters"),
  party: z.string().min(2, "Party must be at least 2 characters"),
  status: z.enum(["active", "inactive"]),
});

type CandidateFormValues = z.infer<typeof candidateFormSchema>;

const CandidateManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const addForm = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      name: "",
      party: "",
      status: "active",
    },
  });
  
  const editForm = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      name: "",
      party: "",
      status: "active",
    },
  });
  
  // Load candidates on component mount
  useEffect(() => {
    fetchCandidates();
  }, []);
  
  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/candidates");
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load candidates",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load candidates",
      });
    }
  };
  
  const onAddCandidate = async (values: CandidateFormValues) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/candidates",
        values
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Candidate Added",
          description: "The candidate has been added successfully.",
        });
        
        addForm.reset();
        setIsAddDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
        fetchCandidates();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to add candidate",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while adding the candidate",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onEditCandidate = async (values: CandidateFormValues) => {
    if (!selectedCandidate) return;
    
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "PATCH",
        `/api/candidates/${selectedCandidate.id}`,
        values
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Candidate Updated",
          description: "The candidate has been updated successfully.",
        });
        
        editForm.reset();
        setIsEditDialogOpen(false);
        setSelectedCandidate(null);
        queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
        fetchCandidates();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to update candidate",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while updating the candidate",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onRemoveCandidate = async (id: number) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "DELETE",
        `/api/candidates/${id}`,
        {}
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Candidate Removed",
          description: "The candidate has been removed successfully.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
        fetchCandidates();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to remove candidate",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while removing the candidate",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    editForm.reset({
      name: candidate.name,
      party: candidate.party,
      status: candidate.status as "active" | "inactive",
    });
    setIsEditDialogOpen(true);
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Candidate Management</CardTitle>
          <CardDescription>Add or modify election candidates</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
              <DialogDescription>
                Enter the details for the new candidate.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddCandidate)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter candidate name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="party"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter party name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Adding..." : "Add Candidate"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="border-t border-neutral-200">
          <div className="px-4 py-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Party</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-sm text-neutral-500">
                      No candidates found. Add your first candidate.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-neutral-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-neutral-900">{candidate.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{candidate.party}</div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          candidate.status === "active" 
                            ? "bg-success bg-opacity-10 text-success" 
                            : "bg-neutral-200 text-neutral-600"
                        }`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditClick(candidate)}
                          className="text-primary hover:text-primary-dark mr-2"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="ml-1">Edit</span>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-error hover:text-error"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="ml-1">Remove</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {candidate.name} as a candidate. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onRemoveCandidate(candidate.id)}
                                className="bg-error hover:bg-error text-white"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
      
      {/* Edit Candidate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update the candidate's information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditCandidate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter candidate name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="party"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter party name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full rounded-md border border-neutral-300 p-2"
                        {...field}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Candidate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CandidateManagement;
