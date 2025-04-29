import { db } from "../server/db";
import { voters, candidates } from "../shared/schema";

async function seedData() {
  console.log("Seeding database with initial data...");

  // Check if we have candidates already
  const existingCandidates = await db.select().from(candidates);
  if (existingCandidates.length === 0) {
    console.log("Adding sample candidates...");
    await db.insert(candidates).values([
      {
        name: "Jane Smith",
        party: "Progressive Party",
        status: "active"
      },
      {
        name: "John Doe",
        party: "Conservative Alliance",
        status: "active"
      },
      {
        name: "Michael Johnson",
        party: "Moderate Union",
        status: "active"
      },
      {
        name: "Sarah Williams",
        party: "Green Future",
        status: "active"
      },
      {
        name: "Robert Brown",
        party: "Liberty Coalition",
        status: "active"
      }
    ]);
  } else {
    console.log(`Found ${existingCandidates.length} existing candidates, skipping...`);
  }

  // Check if we have voters already
  const existingVoters = await db.select().from(voters);
  if (existingVoters.length === 0) {
    console.log("Adding sample voters...");
    
    // Create 10 sample voters
    const sampleVoters = Array.from({ length: 10 }).map((_, i) => ({
      voterId: `VOTER${String(i + 1).padStart(4, '0')}`,
      fullName: `Voter ${i + 1}`,
      dateOfBirth: `1980-01-${String(i + 1).padStart(2, '0')}`,
      address: `123 Main St, Apt ${i + 1}, Cityville, State`,
      hasVoted: false
    }));
    
    await db.insert(voters).values(sampleVoters);
  } else {
    console.log(`Found ${existingVoters.length} existing voters, skipping...`);
  }

  console.log("Seeding completed successfully!");
}

// Run the seed function
seedData()
  .then(() => {
    console.log("Database seeding completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });