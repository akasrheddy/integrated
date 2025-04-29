import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users (admin users of the system)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

// Voters (people who will vote)
export const voters = pgTable("voters", {
  id: serial("id").primaryKey(),
  voterId: text("voter_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  address: text("address").notNull(),
  fingerprintHash: text("fingerprint_hash"),
  facialDataHash: text("facial_data_hash"),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  zkpPublicKey: text("zkp_public_key"),
  blockchainAddress: text("blockchain_address"),
  hasVoted: boolean("has_voted").default(false),
});

export const insertVoterSchema = createInsertSchema(voters).omit({
  id: true,
  registrationDate: true,
  hasVoted: true,
});

// Candidates
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  status: text("status").notNull().default("active"),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  registrationDate: true,
});

// Votes
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  voterId: text("voter_id").notNull().unique(),
  candidateId: integer("candidate_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  blindSignature: text("blind_signature"),
  nftTokenId: text("nft_token_id"),
  transactionHash: text("transaction_hash"),
  merkleProof: jsonb("merkle_proof"),
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  timestamp: true,
});

// Hardware Status
export const hardwareStatus = pgTable("hardware_status", {
  id: serial("id").primaryKey(),
  fingerprintScannerConnected: boolean("fingerprint_scanner_connected").default(false),
  facialRecognitionConnected: boolean("facial_recognition_connected").default(false),
  arduinoStatus: text("arduino_status").default("disconnected"),
  arduinoFirmware: text("arduino_firmware"),
  lastActiveFingerprint: timestamp("last_active_fingerprint"),
  lastActiveFacial: timestamp("last_active_facial"),
  lastSync: timestamp("last_sync").defaultNow(),
});

export const updateHardwareStatusSchema = createInsertSchema(hardwareStatus).omit({
  id: true,
});

// Blockchain Status
export const blockchainStatus = pgTable("blockchain_status", {
  id: serial("id").primaryKey(),
  networkStatus: text("network_status").default("disconnected"),
  activeNodes: integer("active_nodes").default(0),
  latestBlockNumber: integer("latest_block_number"),
  latestBlockHash: text("latest_block_hash"),
  smartContractAddress: text("smart_contract_address"),
  merkleRootHash: text("merkle_root_hash"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const updateBlockchainStatusSchema = createInsertSchema(blockchainStatus).omit({
  id: true,
});

// Relations
export const votersRelations = relations(voters, ({ many }) => ({
  votes: many(votes),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  voter: one(voters, {
    fields: [votes.voterId],
    references: [voters.voterId],
  }),
  candidate: one(candidates, {
    fields: [votes.candidateId],
    references: [candidates.id],
  }),
}));

// Type Exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Voter = typeof voters.$inferSelect;
export type InsertVoter = z.infer<typeof insertVoterSchema>;

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type HardwareStatus = typeof hardwareStatus.$inferSelect;
export type UpdateHardwareStatus = z.infer<typeof updateHardwareStatusSchema>;

export type BlockchainStatus = typeof blockchainStatus.$inferSelect;
export type UpdateBlockchainStatus = z.infer<typeof updateBlockchainStatusSchema>;
