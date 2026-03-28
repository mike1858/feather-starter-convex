# Design: Authentication & Organization

## Overview

Technical design for user authentication, organization creation, and multi-tenant data isolation using Convex Auth with email/password authentication.

## Architecture

### Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Signup Form   │────>│ Atomic Signup   │────>│  Auto Login     │
│ email/pass/name │     │ Org + User      │     │  Redirect       │
│ + org name      │     │ Transaction     │     │  to App         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Every Query/Mutation                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Get User ID │─>│ Get User's  │─>│ Filter by   │     │
│  │ from Auth   │  │ orgId       │  │ orgId       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### organizations
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| name | string | Organization name |
| type | "provider" \| "client" | Organization type |
| createdAt | number | Timestamp |
| createdBy | Id? | User who created |
| updatedAt | number | Last modified |
| updatedBy | Id? | Last modifier |

### users
| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Primary key |
| name | string? | Display name |
| email | string? | Email address |
| orgId | Id? | Organization membership |
| createdAt | number? | Timestamp |
| updatedAt | number? | Last modified |

**Indexes:** by_email, by_org

## API Design

### Authentication Functions

| Function | Type | Description |
|----------|------|-------------|
| auth.signIn | mutation | Email/password login |
| auth.signOut | mutation | End session |
| auth.signUp | mutation | Create org + user atomically |

### Organization Functions

| Function | Type | Description |
|----------|------|-------------|
| organizations.getCurrent | query | Get user's organization |
| organizations.update | mutation | Update org name |

### User Functions

| Function | Type | Description |
|----------|------|-------------|
| users.getCurrent | query | Get current user |
| users.get | query | Get user by ID (org-scoped) |
| users.listByOrg | query | List org members |

## Helper Functions

### getAuthenticatedUser
```typescript
async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("User has no organization");
  return { user, orgId: user.orgId };
}
```

### withOrgAccess
Wrapper that enforces org-scoped queries by automatically filtering results.

## Security Considerations

### Organization Isolation Rules
1. Every query gets authenticated user's orgId
2. All data queries filter by orgId
3. All mutations validate orgId ownership
4. No cross-org data access possible

### Audit Fields
All records include:
- `createdAt` / `createdBy` - creation metadata
- `updatedAt` / `updatedBy` - modification metadata

## Correctness Properties

### P1: Organization Isolation
For any query Q returning data D, all items in D belong to the requesting user's organization.

### P2: Atomic Signup
After successful signup, both organization and user exist. After failed signup, neither exists.

### P3: Audit Trail Completeness
Every create/update operation sets appropriate audit fields.

## Component Design

### Frontend Components

```
src/components/
├── auth/
│   ├── SignupForm.tsx    # Email, password, name, org name
│   ├── LoginForm.tsx     # Email, password
│   └── AuthWrapper.tsx   # Conditional render based on auth state
```

### Auth State Management
```typescript
// In App.tsx
const { isAuthenticated, isLoading } = useConvexAuth();

if (isLoading) return <LoadingSpinner />;
if (!isAuthenticated) return <AuthPage />;
return <AppLayout />;
```
