# Security Specification for PrimeProfit

## Data Invariants
1. Users can only read their own profile, deposits, withdrawals, and reserves.
2. Admins have full access to all collections for management (approving deposits, editing balances).
3. The `balance` field in the user document is immutable for the user; only admins or system-triggered logic (if any) can update it.
4. Minimum reserve amount is $30.
5. Withdrawals of less than $30 are not allowed (enforced by app logic and rules).
6. User `status` can be 'active' or 'blocked'. Blocked users cannot perform writes.
7. `createdAt` and `timestamp` fields are immutable after creation and must match `request.time`.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Balance Hijack**: User trying to update their own `balance` to $1,000,000.
2. **Identity Theft**: User trying to read another user's profile.
3. **Ghost Deposit**: User trying to approve their own deposit.
4. **Unauthorized Withdrawal**: User trying to approve their own withdrawal.
5. **Under-Limit Reserve**: User trying to start a reserve with $10 (minimum is $30).
6. **State Skip**: User trying to move a withdrawal from 'pending' directly to 'approved'.
7. **Negative Balance**: Trying to set a user balance to a negative number.
8. **Immutable Field Tamper**: Trying to update `createdAt` on an existing user.
9. **Blocked Action**: User with `status: 'blocked'` trying to create a deposit.
10. **ID Poisoning**: Submitting a document with a 2KB string as an ID.
11. **Admin Escalation**: User trying to set `isAdmin: true` on their own profile.
12. **Foreign Referral**: User trying to read the list of all referrals.
