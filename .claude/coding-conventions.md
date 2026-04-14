# Coding Conventions

## Python (Backend)

### Formatting & Linting
- **Formatter:** Black (line-length 88)
- **Import sorting:** isort (profile=black)
- **Linter:** ruff
- **Config:** pyproject.toml `[tool.black]`, `[tool.isort]`, `[tool.ruff]`

### Style Rules
- Type hints on **ALL** function signatures
- Docstrings on public functions and classes (Google style)
- Naming: `snake_case` for functions/variables, `PascalCase` for classes
- Constants: `UPPER_CASE` with description comments
- Async: Use `async`/`await` throughout — no sync DB calls
- Error handling: Raise meaningful exceptions, never bare `except:`

### Architecture
- Layer structure: routes → services → repositories → models (max 4 layers)
- Services contain business logic, routes are thin handlers
- One model per file (`client.py`, `proposal.py`, etc.)
- Repositories pattern for data access (optional, but recommended for complex queries)

### Database (SQLAlchemy 2.0 async)
- Primary keys: UUID (`sa.UUID`, `default=uuid4()`)
- Timestamps: `TIMESTAMPTZ` (timezone-aware), never `TIMESTAMP`
- Money: `NUMERIC(12,2)`, never FLOAT or `money` type
- Flexible fields: JSONB for arrays/objects (deliverables, timeline, includes)
- Indexes: Every FK, every frequently queried column, unique constraints on natural keys
- Soft deletes: `deleted_at` column with partial index `WHERE deleted_at IS NULL`

**Example:**
```python
from sqlalchemy import Column, String, Numeric
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class PricingItem(Base):
    __tablename__ = "pricing_items"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1"))
```

## TypeScript/React (Frontend)

### Formatting & Linting
- **Formatter:** Prettier (via Next.js defaults)
- **Linter:** ESLint (strict rules)
- **TypeScript:** Strict mode enabled in tsconfig.json

### Style Rules
- Naming: `camelCase` for functions/variables, `PascalCase` for components/types/interfaces
- Components: Functional components with hooks only, no class components
- Props: Extract prop types as `interface ComponentProps { ... }` above component
- Imports: Group by external, then relative (using path aliases like `@/`)
- No `any` types — always infer or explicitly define types

### Component Structure
```typescript
// lib/api.ts: Typed API client
export const clientsAPI = {
  list: async (filters?: Filters): Promise<Client[]> => {
    const res = await fetch(`${BASE_URL}/api/clients`, { ... });
    return res.json();
  },
};

// components/ClientForm.tsx: Reusable component
interface ClientFormProps {
  onSuccess: (client: Client) => void;
}

export function ClientForm({ onSuccess }: ClientFormProps) {
  // ...
}
```

### Pages (App Router)
```typescript
// app/clients/[id]/page.tsx
"use client";  // All pages are client-side for now
import { useParams } from "next/navigation";

export default function ClientPage() {
  const { id } = useParams();
  // ...
}
```

### Testing (vitest + React Testing Library)
```typescript
describe("ClientForm", () => {
  it("should submit with valid data", async () => {
    const { getByRole } = render(<ClientForm onSuccess={vi.fn()} />);
    // user-event: fireEvent with auto-delay
  });
});
```
