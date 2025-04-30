CREATE TABLE "blockchain_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"network_status" text DEFAULT 'disconnected',
	"active_nodes" integer DEFAULT 0,
	"latest_block_number" integer,
	"latest_block_hash" text,
	"smart_contract_address" text,
	"merkle_root_hash" text,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"party" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"registration_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint_scanner_connected" boolean DEFAULT false,
	"facial_recognition_connected" boolean DEFAULT false,
	"arduino_status" text DEFAULT 'disconnected',
	"arduino_firmware" text,
	"last_active_fingerprint" timestamp,
	"last_active_facial" timestamp,
	"last_sync" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "voters" (
	"id" serial PRIMARY KEY NOT NULL,
	"voter_id" text NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"address" text NOT NULL,
	"fingerprint_hash" text,
	"facial_data_hash" text,
	"registration_date" timestamp DEFAULT now() NOT NULL,
	"zkp_public_key" text,
	"blockchain_address" text,
	"has_voted" boolean DEFAULT false,
	CONSTRAINT "voters_voter_id_unique" UNIQUE("voter_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"voter_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"blind_signature" text,
	"nft_token_id" text,
	"transaction_hash" text,
	"merkle_proof" jsonb,
	CONSTRAINT "votes_voter_id_unique" UNIQUE("voter_id")
);
