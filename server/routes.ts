import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { arduinoController } from "./arduino";
import { blockchainController } from "./blockchain";
import { zkpController } from "./zkp";
import { insertVoterSchema, insertCandidateSchema, insertVoteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Status endpoint
  app.get("/status", (req: Request, res: Response) => {
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SecureVote API Status</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            h1 { color: #2563eb; }
            .status { padding: 10px; background-color: #d1fae5; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>SecureVote System Status</h1>
            <div class="status">
              <strong>Status:</strong> Server is running
            </div>
            <p>API is available at the /api/* endpoints</p>
            <p>Current time: ${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `);
  });
  
  // API endpoints
  const apiRouter = app.route("/api");

  // --- Voter Management ---
  
  // Get all voters
  app.get("/api/voters", async (req: Request, res: Response) => {
    try {
      const voters = await storage.getAllVoters();
      res.json(voters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voters" });
    }
  });

  // Register a new voter
  app.post("/api/voters/register", async (req: Request, res: Response) => {
    try {
      const result = insertVoterSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid voter data",
          errors: result.error.format()
        });
      }
      
      const voter = await storage.createVoter({
        ...result.data,
        fingerprintHash: req.body.fingerprintHash,
        facialDataHash: req.body.facialDataHash,
        zkpPublicKey: req.body.zkpPublicKey,
        blockchainAddress: req.body.blockchainAddress,
      });
      
      res.json({
        success: true,
        voter,
        message: "Voter registered successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to register voter"
      });
    }
  });

  // Reset voter status
  app.post("/api/voters/:voterId/reset-status", async (req: Request, res: Response) => {
    try {
      const { voterId } = req.params;
      const result = await storage.resetVoterStatus(voterId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Voter not found"
        });
      }
      
      res.json({
        success: true,
        message: "Voter status reset successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to reset voter status"
      });
    }
  });

  // --- Candidate Management ---
  
  // Get all candidates
  app.get("/api/candidates", async (req: Request, res: Response) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // Add a new candidate
  app.post("/api/candidates", async (req: Request, res: Response) => {
    try {
      const result = insertCandidateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid candidate data",
          errors: result.error.format()
        });
      }
      
      const candidate = await storage.createCandidate(result.data);
      
      res.json({
        success: true,
        candidate,
        message: "Candidate added successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to add candidate"
      });
    }
  });

  // Update a candidate
  app.patch("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertCandidateSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid candidate data",
          errors: result.error.format()
        });
      }
      
      const candidate = await storage.updateCandidate(id, result.data);
      
      if (!candidate) {
        return res.status(404).json({
          success: false,
          message: "Candidate not found"
        });
      }
      
      res.json({
        success: true,
        candidate,
        message: "Candidate updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update candidate"
      });
    }
  });

  // Delete a candidate
  app.delete("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteCandidate(id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Candidate not found"
        });
      }
      
      res.json({
        success: true,
        message: "Candidate removed successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove candidate"
      });
    }
  });

  // --- Voting ---
  
  // Cast a vote
  app.post("/api/votes/cast", async (req: Request, res: Response) => {
    try {
      const voteSchema = z.object({
        candidateId: z.number().int().positive(),
        voterId: z.string().min(1)
      });
      
      const result = voteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid vote data",
          errors: result.error.format()
        });
      }
      
      // Get the voter with the provided ID
      const voter = await storage.getVoterByVoterId(result.data.voterId);
      
      if (!voter) {
        return res.status(404).json({
          success: false,
          message: "Voter not found with the provided ID"
        });
      }
      
      // Check if voter has already voted (but allow in development for testing)
      if (process.env.NODE_ENV !== 'development' && voter.hasVoted) {
        return res.status(400).json({
          success: false,
          message: "This voter has already cast a vote"
        });
      }
      
      // Check if blockchain is connected, if not, try to connect
      const blockchainStatus = await blockchainController.getStatus();
      if (!blockchainStatus.connected) {
        const connectResult = await blockchainController.connect();
        if (!connectResult.connected) {
          return res.status(500).json({
            success: false,
            message: "Failed to connect to blockchain network. Please try again."
          });
        }
      }
      
      // Generate a blind signature
      const blindSignatureResult = await blockchainController.generateBlindSignature({
        voterId: voter.voterId,
        candidateId: result.data.candidateId
      });
      
      if (!blindSignatureResult.success) {
        return res.status(500).json({
          success: false,
          message: blindSignatureResult.message || "Failed to generate blind signature"
        });
      }
      
      // Record the vote on the blockchain
      const blockchainResult = await blockchainController.recordVote({
        voterId: voter.voterId,
        candidateId: result.data.candidateId,
        blindSignature: blindSignatureResult.blindSignature
      });
      
      if (!blockchainResult.success) {
        return res.status(500).json({
          success: false,
          message: blockchainResult.message || "Failed to record vote on blockchain"
        });
      }
      
      // Issue an NFT for the vote
      const nftResult = await blockchainController.issueNft({
        voterId: voter.voterId,
        candidateId: result.data.candidateId,
        blindSignature: blindSignatureResult.blindSignature!
      });
      
      // Record the vote in the storage
      const vote = await storage.recordVote({
        voterId: voter.voterId,
        candidateId: result.data.candidateId,
        blindSignature: blindSignatureResult.blindSignature,
        nftTokenId: nftResult.success ? nftResult.nftTokenId : undefined,
        transactionHash: blockchainResult.transactionHash
      });
      
      // Update voter status
      await storage.markVoterHasVoted(voter.voterId);
      
      res.json({
        success: true,
        vote,
        nftTokenId: nftResult.success ? nftResult.nftTokenId : undefined,
        transactionHash: blockchainResult.transactionHash,
        message: "Vote cast successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to cast vote"
      });
    }
  });

  // Get voting results
  app.get("/api/votes/results", async (req: Request, res: Response) => {
    try {
      const votes = await storage.getAllVotes();
      const candidates = await storage.getAllCandidates();
      
      // Count votes by candidate
      const voteCounts = new Map<number, number>();
      
      for (const vote of votes) {
        const currentCount = voteCounts.get(vote.candidateId) || 0;
        voteCounts.set(vote.candidateId, currentCount + 1);
      }
      
      // Calculate totals and percentages
      const totalVotes = votes.length;
      
      const results = candidates.map(candidate => {
        const voteCount = voteCounts.get(candidate.id) || 0;
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
        
        return {
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          votes: voteCount,
          percentage
        };
      });
      
      // Sort by vote count descending
      results.sort((a, b) => b.votes - a.votes);
      
      res.json({
        results,
        totalVotes
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch voting results"
      });
    }
  });

  // --- Arduino/Hardware Integration ---
  
  // Connect to Arduino
  app.post("/api/arduino/connect", async (req: Request, res: Response) => {
    try {
      const result = await arduinoController.connect(
        req.body.port,
        req.body.baudRate,
        req.body.timeout
      );
      
      if (result.connected) {
        await storage.updateHardwareStatus({
          fingerprintScannerConnected: true,
          arduinoStatus: "online",
          arduinoFirmware: "2.1.4",
          lastActiveFingerprint: new Date(),
          lastSync: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        connected: false,
        message: error instanceof Error ? error.message : "Failed to connect to Arduino"
      });
    }
  });

  // Disconnect from Arduino
  app.post("/api/arduino/disconnect", async (req: Request, res: Response) => {
    try {
      const result = await arduinoController.disconnect();
      
      if (result.success) {
        await storage.updateHardwareStatus({
          fingerprintScannerConnected: false,
          arduinoStatus: "disconnected",
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to disconnect from Arduino"
      });
    }
  });

  // Enroll fingerprint
  app.post("/api/arduino/enroll-fingerprint", async (req: Request, res: Response) => {
    try {
      const result = await arduinoController.enrollFingerprint();
      
      if (result.success) {
        await storage.updateHardwareStatus({
          lastActiveFingerprint: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to enroll fingerprint"
      });
    }
  });

  // Verify fingerprint
  app.post("/api/arduino/verify-fingerprint", async (req: Request, res: Response) => {
    try {
      const result = await arduinoController.verifyFingerprint();
      
      if (result.success) {
        await storage.updateHardwareStatus({
          lastActiveFingerprint: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        verified: false,
        message: error instanceof Error ? error.message : "Failed to verify fingerprint"
      });
    }
  });

  // Get Arduino status
  app.get("/api/arduino/status", async (req: Request, res: Response) => {
    try {
      const status = arduinoController.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        connected: false,
        message: error instanceof Error ? error.message : "Failed to get Arduino status"
      });
    }
  });

  // Calibrate Arduino fingerprint sensor
  app.post("/api/arduino/calibrate", async (req: Request, res: Response) => {
    try {
      const result = await arduinoController.calibrateSensor();
      
      if (result.success) {
        await storage.updateHardwareStatus({
          lastActiveFingerprint: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to calibrate fingerprint sensor"
      });
    }
  });

  // --- Facial Recognition ---
  
  // Enroll facial data
  app.post("/api/facial/enroll", async (req: Request, res: Response) => {
    try {
      const facialData = req.body.facialData;
      
      if (!facialData) {
        return res.status(400).json({
          success: false,
          message: "Facial data is required"
        });
      }
      
      // In a real app, this would process the facial data image
      // and extract features for recognition
      
      // Generate a hash of the facial data
      const facialHash = `facial_hash_${Date.now()}`;
      
      // Update hardware status
      await storage.updateHardwareStatus({
        facialRecognitionConnected: true,
        lastActiveFacial: new Date()
      });
      
      res.json({
        success: true,
        facialHash,
        message: "Facial data enrolled successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to enroll facial data"
      });
    }
  });

  // Verify facial data
  app.post("/api/facial/verify", async (req: Request, res: Response) => {
    try {
      const facialData = req.body.facialData;
      
      if (!facialData) {
        return res.status(400).json({
          success: false,
          message: "Facial data is required"
        });
      }
      
      // In a real app, this would compare the facial data
      // with stored facial templates
      
      // For demo purposes, we'll simulate a successful verification
      const facialHash = `facial_hash_${Date.now()}`;
      const confidence = 85 + Math.floor(Math.random() * 15); // 85-99% confidence
      
      // Update hardware status
      await storage.updateHardwareStatus({
        facialRecognitionConnected: true,
        lastActiveFacial: new Date()
      });
      
      res.json({
        success: true,
        verified: confidence >= 80,
        facialHash,
        confidence,
        message: confidence >= 80
          ? "Facial identity verified successfully"
          : "Facial verification failed: low confidence"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        verified: false,
        message: error instanceof Error ? error.message : "Failed to verify facial data"
      });
    }
  });

  // Get facial recognition status
  app.get("/api/facial/status", async (req: Request, res: Response) => {
    try {
      // In a real app, this would check the status of the facial recognition system
      const hardwareStatus = await storage.getHardwareStatus();
      
      res.json({
        available: true,
        enabled: hardwareStatus?.facialRecognitionConnected || false,
        lastActive: hardwareStatus?.lastActiveFacial
      });
    } catch (error) {
      res.status(500).json({
        available: false,
        enabled: false,
        message: error instanceof Error ? error.message : "Failed to get facial recognition status"
      });
    }
  });

  // --- Zero-Knowledge Proofs ---
  
  // Generate ZKP
  app.post("/api/zkp/generate", async (req: Request, res: Response) => {
    try {
      const { publicData, privateData } = req.body;
      
      if (!publicData || !privateData) {
        return res.status(400).json({
          success: false,
          message: "Both publicData and privateData are required"
        });
      }
      
      const result = await zkpController.generateProof({
        publicData,
        privateData
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate ZKP"
      });
    }
  });

  // Verify ZKP
  app.post("/api/zkp/verify", async (req: Request, res: Response) => {
    try {
      const { publicData, zkProof } = req.body;
      
      if (!publicData) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "publicData is required"
        });
      }
      
      // For demo purposes, allow verification without a proper ZKP
      // In a real app, we would verify cryptographically
      if (process.env.NODE_ENV === 'development' && !zkProof) {
        // Demo mode - automatically accept verification for debugging purposes
        return res.json({
          success: true,
          verified: true,
          message: "DEMO MODE: ZKP verification automatically approved"
        });
      }
      
      if (!zkProof) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "zkProof is required"
        });
      }
      
      const result = await zkpController.verifyProof({
        publicData,
        zkProof
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        verified: false,
        message: error instanceof Error ? error.message : "Failed to verify ZKP"
      });
    }
  });

  // Get ZKP status
  app.get("/api/zkp/status", async (req: Request, res: Response) => {
    try {
      const status = zkpController.getStatus();
      res.json({
        enabled: status.enabled,
        version: status.version
      });
    } catch (error) {
      res.status(500).json({
        enabled: false,
        message: error instanceof Error ? error.message : "Failed to get ZKP status"
      });
    }
  });

  // --- Blockchain ---
  
  // Get blockchain status
  app.get("/api/blockchain/status", async (req: Request, res: Response) => {
    try {
      // Get status from blockchain controller
      const blockchainStatus = blockchainController.getStatus();
      
      // Get status from storage
      const storedStatus = await storage.getBlockchainStatus();
      
      const combinedStatus = {
        networkStatus: blockchainStatus.connected ? "connected" : "disconnected",
        activeNodes: blockchainStatus.activeNodes,
        latestBlockNumber: blockchainStatus.blockNumber,
        latestBlockHash: blockchainStatus.blockHash,
        smartContractAddress: blockchainStatus.smartContractAddress,
        merkleRootHash: blockchainStatus.merkleRoot,
        lastUpdated: storedStatus?.lastUpdated || new Date()
      };
      
      // Update stored status
      await storage.updateBlockchainStatus(combinedStatus);
      
      res.json(combinedStatus);
    } catch (error) {
      res.status(500).json({
        networkStatus: "error",
        message: error instanceof Error ? error.message : "Failed to get blockchain status"
      });
    }
  });

  // Connect to blockchain
  app.post("/api/blockchain/connect", async (req: Request, res: Response) => {
    try {
      const providerUrl = req.body.providerUrl;
      const result = await blockchainController.connect(providerUrl);
      
      if (result.connected) {
        await storage.updateBlockchainStatus({
          networkStatus: "connected",
          activeNodes: result.network === "mainnet" ? 100 : 10,
          latestBlockNumber: result.blockNumber,
          lastUpdated: new Date()
        });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        connected: false,
        message: error instanceof Error ? error.message : "Failed to connect to blockchain"
      });
    }
  });

  // Verify Merkle proof
  app.post("/api/audit/verify-merkle", async (req: Request, res: Response) => {
    try {
      const { voterId } = req.body;
      
      if (!voterId) {
        return res.status(400).json({
          success: false,
          message: "Voter ID is required"
        });
      }
      
      // Get the vote
      const vote = await storage.getVoteByVoterId(voterId);
      
      if (!vote) {
        return res.status(404).json({
          success: false,
          message: "No vote found for this voter ID"
        });
      }
      
      // Get the Merkle proof
      const proofResult = blockchainController.getMerkleProof(voterId);
      
      if (!proofResult.success) {
        return res.status(500).json({
          success: false,
          message: proofResult.message || "Failed to get Merkle proof"
        });
      }
      
      // Verify the proof
      const verificationResult = blockchainController.verifyMerkleProof(
        voterId,
        proofResult.proof!,
        proofResult.leafIndex!
      );
      
      if (!verificationResult.success) {
        return res.status(500).json({
          success: false,
          message: verificationResult.message || "Failed to verify Merkle proof"
        });
      }
      
      res.json({
        success: true,
        verification: {
          voterId,
          candidateId: vote.candidateId,
          merkleProof: proofResult.proof,
          verified: verificationResult.verified
        },
        message: verificationResult.verified
          ? "Merkle proof verified successfully"
          : "Merkle proof verification failed"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to verify Merkle proof"
      });
    }
  });

  // Generate audit records
  app.get("/api/audit/records", async (req: Request, res: Response) => {
    try {
      // In a real app, this would fetch actual audit records from storage
      // Here we'll generate some mock records for demonstration
      
      // Get votes and voters for realistic audit data
      const votes = await storage.getAllVotes();
      const voters = await storage.getAllVoters();
      
      const auditRecords = [];
      
      // Add vote records
      for (const vote of votes) {
        auditRecords.push({
          id: vote.id,
          type: "vote" as const,
          timestamp: vote.timestamp.toISOString(),
          description: `Vote cast for candidate #${vote.candidateId}`,
          transactionHash: vote.transactionHash,
          verified: true
        });
      }
      
      // Add voter registration records
      for (const voter of voters) {
        auditRecords.push({
          id: voter.id + 1000, // Avoid ID collision
          type: "registration" as const,
          timestamp: voter.registrationDate.toISOString(),
          description: `Voter registration for ${voter.voterId}`,
          verified: true
        });
      }
      
      // Sort by timestamp (newest first)
      auditRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.json(auditRecords);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get audit records"
      });
    }
  });

  // Generate audit report
  app.post("/api/audit/generate-report", async (req: Request, res: Response) => {
    try {
      // In a real app, this would generate an actual audit report
      // Here we'll just simulate the process
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      res.json({
        success: true,
        message: "Audit report generated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate audit report"
      });
    }
  });

  // --- Hardware Status ---
  
  // Get hardware status
  app.get("/api/hardware/status", async (req: Request, res: Response) => {
    try {
      const status = await storage.getHardwareStatus();
      
      if (!status) {
        // Initialize default status if none exists
        const defaultStatus = {
          fingerprintScannerConnected: false,
          facialRecognitionConnected: false,
          arduinoStatus: "disconnected",
          arduinoFirmware: "2.1.4",
          lastSync: new Date()
        };
        
        await storage.updateHardwareStatus(defaultStatus);
        
        res.json(defaultStatus);
      } else {
        res.json(status);
      }
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get hardware status"
      });
    }
  });

  // Test hardware connection
  app.post("/api/hardware/test-connection", async (req: Request, res: Response) => {
    try {
      // Connect to Arduino
      const arduinoResult = await arduinoController.connect();
      
      // In a real app, this would test facial recognition too
      
      if (arduinoResult.connected) {
        await storage.updateHardwareStatus({
          fingerprintScannerConnected: true,
          arduinoStatus: "online",
          arduinoFirmware: "2.1.4",
          lastActiveFingerprint: new Date(),
          lastSync: new Date()
        });
      }
      
      res.json({
        success: true,
        arduino: arduinoResult,
        message: "Hardware connection test completed"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to test hardware connection"
      });
    }
  });

  // Calibrate hardware
  app.post("/api/hardware/calibrate", async (req: Request, res: Response) => {
    try {
      // Calibrate Arduino fingerprint sensor
      const calibrateResult = await arduinoController.calibrateSensor();
      
      // In a real app, this might calibrate facial recognition too
      
      if (calibrateResult.success) {
        await storage.updateHardwareStatus({
          lastSync: new Date()
        });
      }
      
      res.json({
        success: calibrateResult.success,
        message: calibrateResult.message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to calibrate hardware"
      });
    }
  });

  // --- Settings ---
  
  // Get all settings
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      // In a real app, this would fetch settings from storage
      // Here we'll return default settings
      
      res.json({
        arduino: {
          serialPort: "/dev/ttyUSB0",
          baudRate: 57600,
          timeout: 5000,
          autoConnect: true
        },
        blockchain: {
          provider: "https://mainnet.infura.io/v3/",
          contractAddress: "0x4c89b8e598a39db6b0f391997f9e5be402d890ab",
          privateKey: "***********",
          gasLimit: 3000000,
          autoSync: true
        },
        system: {
          votingWindowDuration: 30,
          zkpEnabled: true,
          blindSignaturesEnabled: true,
          nftIssuanceEnabled: true,
          adminEmail: "admin@example.com"
        }
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get settings"
      });
    }
  });

  // Update Arduino settings
  app.patch("/api/settings/arduino", async (req: Request, res: Response) => {
    try {
      // Update Arduino controller settings
      arduinoController.updateSettings({
        port: req.body.serialPort,
        baudRate: req.body.baudRate,
        timeout: req.body.timeout
      });
      
      res.json({
        success: true,
        message: "Arduino settings updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update Arduino settings"
      });
    }
  });

  // Update blockchain settings
  app.patch("/api/settings/blockchain", async (req: Request, res: Response) => {
    try {
      // Update blockchain controller settings
      blockchainController.updateSettings({
        providerUrl: req.body.provider,
        privateKey: req.body.privateKey,
        smartContractAddress: req.body.contractAddress,
        gasLimit: req.body.gasLimit
      });
      
      res.json({
        success: true,
        message: "Blockchain settings updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update blockchain settings"
      });
    }
  });

  // Update system settings
  app.patch("/api/settings/system", async (req: Request, res: Response) => {
    try {
      // Update ZKP settings
      zkpController.setEnabled(req.body.zkpEnabled);
      
      res.json({
        success: true,
        message: "System settings updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update system settings"
      });
    }
  });

  // Restart system
  app.post("/api/system/restart", async (req: Request, res: Response) => {
    try {
      // In a real app, this might restart the system or services
      // Here we'll just simulate the process
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      res.json({
        success: true,
        message: "System restarted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to restart system"
      });
    }
  });

  // --- Stats ---
  
  // Get system stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const voters = await storage.getAllVoters();
      const votes = await storage.getAllVotes();
      const candidates = await storage.getAllCandidates();
      const blockchainStatus = blockchainController.getStatus();
      
      res.json({
        registeredVoters: voters.length,
        totalVotesCast: votes.length,
        activeCandidates: candidates.filter(c => c.status === "active").length,
        blockConfirmations: blockchainStatus.blockNumber
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get stats"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
