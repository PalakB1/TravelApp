-- Remove the proposal/quote builder. It required typing every field by hand,
-- which is the wrong shape for a pre-sale tool, so the feature is withdrawn.
-- Only an empty placeholder row existed; no customer-facing data is lost.
DROP TABLE IF EXISTS "ProposalDay";
DROP TABLE IF EXISTS "Proposal";
