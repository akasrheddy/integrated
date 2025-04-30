import { 
  voters, candidates, votes, hardwareStatus, blockchainStatus,
  Voter, InsertVoter,
  Candidate, InsertCandidate,
  Vote, InsertVote,
  HardwareStatus, UpdateHardwareStatus,
  BlockchainStatus, UpdateBlockchainStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, max, sql } from "drizzle-orm";
import { IStorage } from "./storage";

// Define a new table structure for fingerprint mappings
// This should ideally be properly added to the schema, but we'll create a minimal implementation here
const fingerprintMappings = {
  userId: "user_id",
  fingerprintId: "fingerprint_id",
};

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

  // Fingerprint operations - Added to match Arduino requirements
  async getNextAvailableFingerprintId(): Promise<number> {
    try {
      // Execute a raw SQL query to find the max fingerprint ID
      // Since we don't have a formal fingerprint_mappings table in schema.ts,
      // this is a simplified implementation
      const result = await db.execute(sql`
        SELECT MAX(fingerprint_id::integer) as max_id
        FROM (
          SELECT fingerprint_hash as fingerprint_id 
          FROM voters 
          WHERE fingerprint_hash ~ '^[0-9]+$'
        ) as fingerprint_ids
      `);
      
      // Extract the maximum ID (if exists)
      const maxId = result[0]?.max_id ? parseInt(result[0].max_id) : 0;
      
      // Return next available ID (ensuring it's within R307 sensor range: 1-127)
      return Math.min(maxId + 1, 127) || 1;
    } catch (error) {
      console.error("Error getting next fingerprint ID:", error);
      return 1; // Default to ID 1 if we can't determine
    }
  }

  async registerFingerprint(userId: number, fingerprintId: number): Promise<void> {
    try {
      // Update the voter's fingerprintHash to store the template ID
      // This is a simplified approach; ideally, we would have a dedicated fingerprint_mappings table
      await db
        .update(voters)
        .set({ fingerprintHash: fingerprintId.toString() })
        .where(eq(voters.id, userId));
    } catch (error) {
      console.error(`Failed to register fingerprint ${fingerprintId} for user ${userId}:`, error);
      throw error;
    }
  }

  async getFingerprintByUserId(userId: number): Promise<number | null> {
    try {
      const [voter] = await db
        .select({ fingerprintHash: voters.fingerprintHash })
        .from(voters)
        .where(eq(voters.id, userId));
      
      if (voter?.fingerprintHash && /^\d+$/.test(voter.fingerprintHash)) {
        return parseInt(voter.fingerprintHash);
      }
      return null;
    } catch (error) {
      console.error(`Failed to get fingerprint for user ${userId}:`, error);
      return null;
    }
  }

  async deleteFingerprint(fingerprintId: number): Promise<boolean> {
    try {
      // Find voters with this fingerprint ID and clear their fingerprintHash
      const [updatedVoter] = await db
        .update(voters)
        .set({ fingerprintHash: null })
        .where(eq(voters.fingerprintHash, fingerprintId.toString()))
        .returning();
        
      return !!updatedVoter;
    } catch (error) {
      console.error(`Failed to delete fingerprint ${fingerprintId}:`, error);
      return false;
    }
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