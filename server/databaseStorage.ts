import { 
  voters, candidates, votes, hardwareStatus, blockchainStatus,
  Voter, InsertVoter,
  Candidate, InsertCandidate,
  Vote, InsertVote,
  HardwareStatus, UpdateHardwareStatus,
  BlockchainStatus, UpdateBlockchainStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Voter operations
  async getVoter(id: number): Promise<Voter | undefined> {
    const [voter] = await db.select().from(voters).where(eq(voters.id, id));
    return voter;
  }

  async getVoterByVoterId(voterId: string): Promise<Voter | undefined> {
    const [voter] = await db.select().from(voters).where(eq(voters.voterId, voterId));
    return voter;
  }

  async getAllVoters(): Promise<Voter[]> {
    return await db.select().from(voters);
  }

  async createVoter(voter: InsertVoter & { 
    fingerprintHash?: string; 
    facialDataHash?: string;
    zkpPublicKey?: string;
    blockchainAddress?: string;
  }): Promise<Voter> {
    const [newVoter] = await db.insert(voters).values(voter).returning();
    return newVoter;
  }

  async updateVoter(id: number, voterUpdate: Partial<InsertVoter>): Promise<Voter | undefined> {
    const [updatedVoter] = await db
      .update(voters)
      .set(voterUpdate)
      .where(eq(voters.id, id))
      .returning();
    return updatedVoter;
  }

  async deleteVoter(id: number): Promise<boolean> {
    const [deletedVoter] = await db
      .delete(voters)
      .where(eq(voters.id, id))
      .returning();
    return !!deletedVoter;
  }

  async markVoterHasVoted(voterId: string): Promise<boolean> {
    const [updatedVoter] = await db
      .update(voters)
      .set({ hasVoted: true })
      .where(eq(voters.voterId, voterId))
      .returning();
    return !!updatedVoter;
  }

  async resetVoterStatus(voterId: string): Promise<boolean> {
    const [updatedVoter] = await db
      .update(voters)
      .set({ hasVoted: false })
      .where(eq(voters.voterId, voterId))
      .returning();
    return !!updatedVoter;
  }

  // Candidate operations
  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));
    return candidate;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates);
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values(candidate)
      .returning();
    return newCandidate;
  }

  async updateCandidate(id: number, candidateUpdate: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [updatedCandidate] = await db
      .update(candidates)
      .set(candidateUpdate)
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<boolean> {
    const [deletedCandidate] = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning();
    return !!deletedCandidate;
  }

  // Vote operations
  async getVote(id: number): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id));
    return vote;
  }

  async getVoteByVoterId(voterId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.voterId, voterId));
    return vote;
  }

  async getAllVotes(): Promise<Vote[]> {
    return await db.select().from(votes);
  }

  async recordVote(vote: InsertVote & { 
    blindSignature?: string;
    nftTokenId?: string;
    transactionHash?: string;
  }): Promise<Vote> {
    const [newVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  // Hardware status operations
  async getHardwareStatus(): Promise<HardwareStatus | undefined> {
    const [status] = await db
      .select()
      .from(hardwareStatus)
      .orderBy(desc(hardwareStatus.id))
      .limit(1);
    return status;
  }

  async updateHardwareStatus(statusUpdate: Partial<UpdateHardwareStatus>): Promise<HardwareStatus> {
    // Try to update existing status
    const currentStatus = await this.getHardwareStatus();
    
    if (currentStatus) {
      const [updatedStatus] = await db
        .update(hardwareStatus)
        .set(statusUpdate)
        .where(eq(hardwareStatus.id, currentStatus.id))
        .returning();
      return updatedStatus;
    } else {
      // Create a new status entry if one doesn't exist
      const [newStatus] = await db
        .insert(hardwareStatus)
        .values(statusUpdate)
        .returning();
      return newStatus;
    }
  }

  // Blockchain status operations
  async getBlockchainStatus(): Promise<BlockchainStatus | undefined> {
    const [status] = await db
      .select()
      .from(blockchainStatus)
      .orderBy(desc(blockchainStatus.id))
      .limit(1);
    return status;
  }

  async updateBlockchainStatus(statusUpdate: Partial<UpdateBlockchainStatus>): Promise<BlockchainStatus> {
    // Try to update existing status
    const currentStatus = await this.getBlockchainStatus();
    
    if (currentStatus) {
      const [updatedStatus] = await db
        .update(blockchainStatus)
        .set(statusUpdate)
        .where(eq(blockchainStatus.id, currentStatus.id))
        .returning();
      return updatedStatus;
    } else {
      // Create a new status entry if one doesn't exist
      const [newStatus] = await db
        .insert(blockchainStatus)
        .values(statusUpdate)
        .returning();
      return newStatus;
    }
  }
}