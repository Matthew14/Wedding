// Aurora sits in a private VPC with no direct TCP access.
// The surviving tests (auth, accessibility) do not depend on DB state,
// so resetDatabase is a deliberate no-op.
// If a future test needs DB setup, route it through the RDS Data API instead.
export async function resetDatabase(): Promise<void> {
    // no-op
}
