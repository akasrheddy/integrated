import { 
  Voter, InsertVoter, 
  Candidate, InsertCandidate, 
  Vote, InsertVote, 
  HardwareStatus, UpdateHardwareStatus,
  BlockchainStatus, UpdateBlockchainStatus
} from "@shared/schema";

export interface IStorage {
  // Voter operations
  getVoter(id: number): Promise<Voter | undefined>;
  getVoterByVoterId(voterId: string): Promise<Voter | undefined>;
  getAllVoters(): Promise<Voter[]>;
  createVoter(voter: InsertVoter & { 
    fingerprintHash?: string; 
    facialDataHash?: string;
    zkpPublicKey?: string;
    blockchainAddress?: string;
  }): Promise<Voter>;
  updateVoter(id: number, voter: Partial<InsertVoter>): Promise<Voter | undefined>;
  deleteVoter(id: number): Promise<boolean>;
  markVoterHasVoted(voterId: string): Promise<boolean>;
  resetVoterStatus(voterId: string): Promise<boolean>;

  // Candidate operations
  getCandidate(id: number): Promise<Candidate | undefined>;
  getAllCandidates(): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: number): Promise<boolean>;

  // Vote operations
  getVote(id: number): Promise<Vote | undefined>;
  getVoteByVoterId(voterId: string): Promise<Vote | undefined>;
  getAllVotes(): Promise<Vote[]>;
  recordVote(vote: InsertVote & { 
    blindSignature?: string;
    nftTokenId?: string;
    transactionHash?: string;
  }): Promise<Vote>;

  // Hardware status operations
  getHardwareStatus(): Promise<HardwareStatus | undefined>;
  updateHardwareStatus(status: Partial<UpdateHardwareStatus>): Promise<HardwareStatus>;

  // Blockchain status operations
  getBlockchainStatus(): Promise<BlockchainStatus | undefined>;
  updateBlockchainStatus(status: Partial<UpdateBlockchainStatus>): Promise<BlockchainStatus>;
}

export class MemStorage implements IStorage {
  private voters: Map<number, Voter>;
  private votersByVoterId: Map<string, Voter>;
  private candidates: Map<number, Candidate>;
  private votes: Map<number, Vote>;
  private votesByVoterId: Map<string, Vote>;
  private hardwareStatus: HardwareStatus | undefined;
  private blockchainStatus: BlockchainStatus | undefined;
  
  private voterIdCounter: number;
  private candidateIdCounter: number;
  private voteIdCounter: number;

  constructor() {
    this.voters = new Map();
    this.votersByVoterId = new Map();
    this.candidates = new Map();
    this.votes = new Map();
    this.votesByVoterId = new Map();
    
    this.voterIdCounter = 1;
    this.candidateIdCounter = 1;
    this.voteIdCounter = 1;

    // Initialize with sample data for demonstration
    this.initSampleData();
  }

  // Initialize sample data for demonstration
  private async initSampleData() {
    // Initialize hardware status
    this.hardwareStatus = {
      id: 1,
      fingerprintScannerConnected: true,
      facialRecognitionConnected: true,
      arduinoStatus: "online",
      arduinoFirmware: "2.1.4",
      lastActiveFingerprint: new Date(),
      lastActiveFacial: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      lastSync: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
    };

    // Initialize blockchain status
    this.blockchainStatus = {
      id: 1,
      networkStatus: "connected",
      activeNodes: 10,
      latestBlockNumber: 45789,
      latestBlockHash: "0x7dc32a1b429330b8be98d5515267c96dba93f8a94b15a23d4e12c3497a12ead8",
      smartContractAddress: "0x4c89b8e598a39db6b0f391997f9e5be402d890ab",
      merkleRootHash: "0xf7f803c45e47a57da3f708312a4108a13083e235",
      lastUpdated: new Date(),
    };

    // Add sample candidates
    await this.createCandidate({
      name: "Jane Smith",
      party: "Progressive Party",
      status: "active",
    });

    await this.createCandidate({
      name: "John Doe",
      party: "Conservative Alliance",
      status: "active",
    });

    await this.createCandidate({
      name: "Alex Johnson",
      party: "Independent",
      status: "active",
    });

    // Add sample voters
    for (let i = 1; i <= 100; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      await this.createVoter({
        voterId: `VOTER${i.toString().padStart(4, '0')}`,
        fullName: `Voter ${i}`,
        dateOfBirth: `${1960 + Math.floor(Math.random() * 40)}-${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}-${(Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0')}`,
        address: `${Math.floor(Math.random() * 9999) + 1} Main St, City ${Math.floor(Math.random() * 100) + 1}, State ${Math.floor(Math.random() * 50) + 1}`,
        registrationDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        fingerprintHash: Math.random() > 0.3 ? `fingerprint_hash_${i}` : undefined,
        facialDataHash: Math.random() > 0.6 ? `facial_hash_${i}` : undefined,
        blockchainAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        hasVoted: Math.random() > 0.6, // About 40% of voters have voted
      });
    }

    // Add sample votes for voters who have voted
    for (const voter of this.voters.values()) {
      if (voter.hasVoted) {
        const candidateId = Math.floor(Math.random() * 3) + 1; // Random candidate (1, 2, or 3)
        const daysAgo = Math.floor(Math.random() * 10);
        await this.recordVote({
          voterId: voter.voterId,
          candidateId,
          timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          blindSignature: `blind_sig_${voter.voterId}`,
          nftTokenId: `0x${Math.random().toString(16).substring(2, 34)}`,
          transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          merkleProof: { proof: [`proof_${voter.voterId}`] },
        });
      }
    }
  }

  // Voter Operations
  async getVoter(id: number): Promise<Voter | undefined> {
    return this.voters.get(id);
  }

  async getVoterByVoterId(voterId: string): Promise<Voter | undefined> {
    return this.votersByVoterId.get(voterId);
  }

  async getAllVoters(): Promise<Voter[]> {
    return Array.from(this.voters.values());
  }

  async createVoter(voter: InsertVoter & { 
    fingerprintHash?: string; 
    facialDataHash?: string;
    zkpPublicKey?: string;
    blockchainAddress?: string;
  }): Promise<Voter> {
    const id = this.voterIdCounter++;
    const newVoter: Voter = {
      id,
      ...voter,
      registrationDate: voter.registrationDate || new Date(),
      hasVoted: false,
    };

    this.voters.set(id, newVoter);
    this.votersByVoterId.set(voter.voterId, newVoter);
    return newVoter;
  }

  async updateVoter(id: number, updates: Partial<InsertVoter>): Promise<Voter | undefined> {
    const voter = this.voters.get(id);
    if (!voter) return undefined;

    const updatedVoter = { ...voter, ...updates };
    this.voters.set(id, updatedVoter);
    this.votersByVoterId.set(updatedVoter.voterId, updatedVoter);
    return updatedVoter;
  }

  async deleteVoter(id: number): Promise<boolean> {
    const voter = this.voters.get(id);
    if (!voter) return false;

    this.votersByVoterId.delete(voter.voterId);
    return this.voters.delete(id);
  }

  async markVoterHasVoted(voterId: string): Promise<boolean> {
    const voter = this.votersByVoterId.get(voterId);
    if (!voter) return false;

    voter.hasVoted = true;
    this.voters.set(voter.id, voter);
    this.votersByVoterId.set(voterId, voter);
    return true;
  }

  async resetVoterStatus(voterId: string): Promise<boolean> {
    const voter = this.votersByVoterId.get(voterId);
    if (!voter) return false;

    voter.hasVoted = false;
    this.voters.set(voter.id, voter);
    this.votersByVoterId.set(voterId, voter);
    return true;
  }

  // Candidate Operations
  async getCandidate(id: number): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const id = this.candidateIdCounter++;
    const newCandidate: Candidate = {
      id,
      ...candidate,
      registrationDate: new Date(),
    };

    this.candidates.set(id, newCandidate);
    return newCandidate;
  }

  async updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;

    const updatedCandidate = { ...candidate, ...updates };
    this.candidates.set(id, updatedCandidate);
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<boolean> {
    return this.candidates.delete(id);
  }

  // Vote Operations
  async getVote(id: number): Promise<Vote | undefined> {
    return this.votes.get(id);
  }

  async getVoteByVoterId(voterId: string): Promise<Vote | undefined> {
    return this.votesByVoterId.get(voterId);
  }

  async getAllVotes(): Promise<Vote[]> {
    return Array.from(this.votes.values());
  }

  async recordVote(vote: InsertVote & { 
    blindSignature?: string;
    nftTokenId?: string;
    transactionHash?: string;
  }): Promise<Vote> {
    // If there's an existing vote for this voter, replace it (only last vote counts)
    const existingVote = this.votesByVoterId.get(vote.voterId);
    
    const id = existingVote ? existingVote.id : this.voteIdCounter++;
    const newVote: Vote = {
      id,
      ...vote,
      timestamp: vote.timestamp || new Date(),
    };

    this.votes.set(id, newVote);
    this.votesByVoterId.set(vote.voterId, newVote);
    return newVote;
  }

  // Hardware Status Operations
  async getHardwareStatus(): Promise<HardwareStatus | undefined> {
    return this.hardwareStatus;
  }

  async updateHardwareStatus(updates: Partial<UpdateHardwareStatus>): Promise<HardwareStatus> {
    if (!this.hardwareStatus) {
      this.hardwareStatus = {
        id: 1,
        fingerprintScannerConnected: false,
        facialRecognitionConnected: false,
        arduinoStatus: "disconnected",
        ...updates,
      };
    } else {
      this.hardwareStatus = { ...this.hardwareStatus, ...updates };
    }
    return this.hardwareStatus;
  }

  // Blockchain Status Operations
  async getBlockchainStatus(): Promise<BlockchainStatus | undefined> {
    return this.blockchainStatus;
  }

  async updateBlockchainStatus(updates: Partial<UpdateBlockchainStatus>): Promise<BlockchainStatus> {
    if (!this.blockchainStatus) {
      this.blockchainStatus = {
        id: 1,
        networkStatus: "disconnected",
        activeNodes: 0,
        ...updates,
      };
    } else {
      this.blockchainStatus = { ...this.blockchainStatus, ...updates };
    }
    return this.blockchainStatus;
  }
}

import { DatabaseStorage } from "./databaseStorage";

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
