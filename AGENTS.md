# Code Quality Principles

## No Shortcuts, No Hacks

- Every line of code should be intentional and well-reasoned
- If a solution feels hacky, step back and find the proper approach
- Technical debt is not acceptable - do it right the first time
- When fixing bugs, understand the root cause rather than patching symptoms

### Type Safety is Non-Negotiable

- **Never use non-null assertions (`!`)** - if a value might be null, handle it explicitly
- **Never cast types (`as`)** - if TypeScript complains, fix the underlying type issue
- **Never use `any`** - take the time to define proper types
- **Never use `@ts-ignore` or `@ts-expect-error`** - these hide real problems
- **Use Zod whenever possible for unknown or unstructured data** - validate external inputs, API responses, JSON blobs, and third-party payloads at the boundary before treating them as typed data
- **Prefer `isPresent` from `utils` for null/undefined checks** - it narrows `T | null | undefined` to `T`, so use `isPresent(value)` / `!isPresent(value)` instead of `value !== null` or `value === undefined` comparisons
- Let TypeScript guide you - compiler errors are features, not obstacles

```typescript
// Bad - hiding potential issues
const user = getUser()!
const name = (data as UserData).name
const config: any = loadConfig()

// Good - explicit handling
const user = getUser()
if (!user) {
  throw new Error('User not found.')
}

const data = getUserData()
if (!isUserData(data)) {
  throw new Error('Invalid user data.')
}

const config: AppConfig = loadConfig()
```

### Simplicity Over Cleverness

- The best code is obvious code that any developer can understand immediately
- Avoid premature abstraction - don't create utilities for one-time operations
- Three similar lines of code are better than a premature abstraction
- Question every abstraction: does it genuinely reduce complexity?

### Minimize Code, Maximize Reuse

- The best code is the code you don't write - add as little as possible
- Before writing new code, search for existing functions that solve the problem
- Extend or adapt existing utilities rather than creating parallel implementations
- If similar logic exists elsewhere, refactor to share it rather than duplicating
- When adding a feature, first check `/utils`, `/hooks`, and `/data-loaders`
- Duplication is a bug - if you see the same logic twice, consolidate it

### Extend Shared Components, Don't Fork Them

- When a component is one of a family sharing a wrapper (e.g., several filters using `<Filter>`, several modals using `<ModalContainer>`), extend the shared wrapper instead of forking down to its underlying primitives for one consumer.
- Before reaching for the primitives a shared component is built on, check whether the missing capability is one unexposed prop away. Threading a prop through the wrapper keeps every sibling on the same path and lets future improvements benefit all of them.
- A fork pays a hidden tax: visual drift, duplicated dropdown/popover/styling logic, and a sibling that no longer inherits fixes made to the shared path. The drift may not be obvious in the PR that introduces it - it shows up months later as "why does this one look different?"
- When modifying one member of a family, eyeball the siblings. Divergence in trigger styling, dropdown chrome, copy patterns, or behavior is a smell - either pull the new behavior up into the shared component or align the siblings.

### Error Handling

- Handle errors at the appropriate level - don't swallow them silently
- Provide meaningful error messages that help diagnose issues
- Fail fast and fail clearly - surface problems immediately

### Code Aesthetics

- Code should be beautiful and readable - take pride in craftsmanship
- Consistent formatting and structure throughout
- Logical organization within files - related code stays together
- White space and grouping should guide the reader's eye

### File Organization

- **Put helper functions in helper files, not in component files** - utility functions (pure functions that compute or transform data) should live in `helpers/` directories, not at the top level of component files. Components should import from helpers.
  - Component files should contain only the component definition, types specific to that component, and hooks/callbacks that depend on component state
  - Extract reusable logic to `helpers/client/` for client-side utilities or `helpers/api/` for server-side utilities
  - If multiple components need the same helper, it definitely belongs in a helper file

### UI Consistency

- When the same data appears in multiple places (list view vs detail view, card vs modal), it should render identically
- Extract shared rendering logic into reusable functions or components rather than duplicating display logic
- If you change how something displays in one place, search for other places showing the same data

## Code Style Guidelines

### CSS and Tailwind

- **Avoid negative margins** - they often indicate a structural problem. Fix the underlying layout instead.
  - **Exception:** The `-mx-N px-N` pattern (negative margin + equal padding) is permitted for extending interactive hover/selection backgrounds beyond content bounds. This is a standard technique used by Tailwind UI and Radix.
- **Be suspicious of arbitrary pixel values** like `[13px]`, `[17px]`, `w-[137px]`. These usually indicate something is wrong - a misunderstanding of the layout or a hack. Use standard Tailwind spacing (`px-3`, `gap-4`, `w-40`) whenever possible.
  - **Exception:** Small optical adjustments for icons or visual alignment (e.g., `mt-[1px]` to vertically center an icon) are acceptable when standard values don't work.
- Use proper flexbox/grid alignment (`items-center`, `justify-between`, `gap-*`) instead of margin hacks
- **Avoid `dark:` modifiers** - they make it difficult to maintain color consistency and are generally a patch. Instead, use semantic color tokens from the theme that automatically adapt to light and dark modes.

### Functional Programming

- **Always use functional alternatives** - functional code is more readable, testable, and less error-prone
- Write pure functions without side effects
- Avoid mutations - never modify input parameters
- **Avoid variable reassignment** - use ternaries, extracted functions, or early returns instead of `let` with reassignment
- **Avoid IIFEs for control flow** - when logic is complex enough that an IIFE feels necessary to avoid `let`, extract it into a named helper function instead

**Prefer array methods over loops:**

- **Never use `for` loops** - use `.map()`, `.filter()`, `.reduce()`, or `.find()` instead
- **Avoid `forEach` for data transformation** - use `.map()` when building new arrays. `forEach` is acceptable for fire-and-forget side effects where the return value is unused. Use `executeWithConcurrencyLimit` (from `helpers/util/promise.ts`) for async operations with controlled concurrency
- When building objects from arrays, use `.reduce()` or `new Map()` with `.map()`

```typescript
// Bad - for loop
const results = []
for (let i = 0; i < items.length; i++) {
  results.push(transform(items[i]))
}

// Good - map
const results = items.map(transform)

// Bad - forEach to build data (use reduce or Map instead)
const mapping = {}
speakers.forEach((speaker, index) => {
  mapping[speaker] = getDefaultSpeakerName(index)
})

// Good - reduce or Map constructor
const mapping = speakers.reduce(
  (acc, speaker, index) => ({
    ...acc,
    [speaker]: getDefaultSpeakerName(index),
  }),
  {}
)

// Better - Map with functional construction
const speakerMapping = new Map(
  speakers.map((speaker, index) => [speaker, getDefaultSpeakerName(index)])
)

// Bad - forEach for async operations
items.forEach(async (item) => {
  await processItem(item)
})

// Good - executeWithConcurrencyLimit for controlled async
await executeWithConcurrencyLimit(items, 5, async (item) => {
  await processItem(item)
})

// Bad - variable reassignment
let value = a
if (condition) {
  value = b
}
if (otherCondition) {
  value = c
}

// Good - ternary for simple cases
const value = condition ? b : a

// Good - extracted function for complex logic
const getValue = () => {
  if (condition) return b
  if (otherCondition) return c
  return a
}
const value = getValue()
```

### TypeScript Style

- **Exported types belong in `/types`** - NEVER export types from hooks, helpers, components, or other files. If a type needs to be shared or exported, it must live in `packages/types/`. Local types used only within a single file are fine, but the moment you add `export type`, move it to the types package. This is non-negotiable.
- **Shared schemas belong in `packages/types/src/schemas/`** - if a Zod schema or validation schema is reused across modules, move it to the schemas folder in `/types` instead of defining parallel schemas in app or package code.
- **Use const arrow functions** - always declare functions as `const fnName = () => {}` instead of `function fnName() {}`
- **Let TypeScript infer return types** - don't annotate return types unless necessary for public APIs or when inference fails
- **Use bare `return`** instead of `return undefined` - they're equivalent, prefer the simpler form
- **Don't pass placeholder values** - if a property is optional, omit it rather than passing `undefined`, `null`, or empty strings
- **Use exhaustive switches** - When switching on union types or enums, use the exhaustive pattern with a `never` assertion instead of a default case. This ensures TypeScript catches unhandled cases at compile time.

```typescript
// Bad - unnecessary verbosity
export const getValue = (id: string): string | undefined => {
  if (!id) return undefined
  return items.get(id)
}

// Good - let inference work, use bare return
export const getValue = (id: string) => {
  if (!id) return
  return items.get(id)
}

// Bad - passing placeholder values for optional properties
const item = {
  item: menuItem,
  parentLabel: '',
  parentIcon: undefined,
  filterFunction: () => {},
}

// Good - omit optional properties entirely
const item = { item: menuItem }

// Bad - silently ignores new enum values
switch (status) {
  case 'pending':
    return 'Waiting'
  case 'active':
    return 'Running'
  default:
    return ''
}

// Good - compiler error if new cases are added
switch (status) {
  case 'pending':
    return 'Waiting'
  case 'active':
    return 'Running'
  default: {
    const _absurd: never = status
    return _absurd
  }
}
```

### Component Organization

- **Keep components focused on rendering** - components should primarily contain JSX and UI logic
- **Extract helper functions to separate files** - utility functions, data transformations, and business logic should live in `helpers/` directories, not defined at the top level of component files
- **Use existing helper locations** - `helpers/client/` for client-side utilities, `helpers/util/` for general utilities, or create domain-specific files in `/utils`
- **Keep `useEffect` inside custom hooks in separate files** - components should not call `useEffect` directly. If effectful React logic is needed, extract it into a focused custom hook in a separate hook file and call that hook from the component

### Async Code

- **Prefer `async/await` with `try/catch`** over `.then()/.catch()` chains - it's more readable and easier to debug
- **Avoid `.catch` blocks** - use `try/catch` around awaited calls so error handling stays structured and readable
- When calling async code in `useEffect`, keep the effect inside a custom hook and create an inner async function there

```typescript
// Bad - promise chains are harder to follow
fetchData()
  .then((data) => processData(data))
  .then((result) => setResult(result))
  .catch((error) => handleError(error))

// Good - async/await is clearer
const loadData = async () => {
  try {
    const data = await fetchData()
    const result = await processData(data)
    setResult(result)
  } catch (error) {
    handleError(error)
  }
}

// Good - async function inside a custom hook effect
const useSyncPreference = (preference: string) => {
  useEffect(() => {
    const syncPreference = async () => {
      try {
        await savePreference(preference)
      } catch (error) {
        captureException(error)
      }
    }
    syncPreference()
  }, [preference])
}
```

### Naming Conventions

- **Always use complete words** - never abbreviate variable names, parameters, or identifiers
  - `microphone` not `mic`
  - `error` not `err`
  - `message` not `msg`
  - `configuration` not `config`
  - `recordingAnimationProgress` not `recordingAnimProg`
- Functions use action verbs: `calculateTotal`, `validateUserInput`, `fetchUserProfile`
- Booleans use is/has/can prefixes: `isActive`, `hasPermission`, `canEdit`
- File naming: camelCase and singular form (`helpers/actionItem.ts`)
- **Icon components**: Name icons by what they visually depict, not by their usage (`ArrowTopRightIcon` not `ExternalLinkIcon`, `ChevronDownIcon` not `DropdownIcon`)
- **DOM element IDs**: Define constants for element IDs used in `getElementById` or portal targets (e.g., `LAYOUT_CONTENT_AREA_ID`, `TOPBAR_ID` in `constants/layout.ts`). This prevents typos and makes ID dependencies explicit.
- **Enum values**: Use PascalCase for enum string values to match Prisma's convention (`ActionItem = 'ActionItem'`, not `action_item = 'action_item'`). Enum member names are always PascalCase.

### Comments and Error Messages

- Write complete sentences with periods
- Error messages must end with periods: `throw new Error("User email is required.")`

## Code Review Guidelines

> The full review standard — line-by-line depth, severity/confidence schema, the judgment concerns, and what to leave to deterministic tooling — lives in the **`code-review-standards`** skill (`.claude/skills/code-review-standards/SKILL.md` — read it directly if your agent doesn't load skills, e.g. Codex). Load it when reviewing a PR. The automated reviewer (`.github/workflows/ai-review.yml`) routes diffs to specialist subagents in `.omp/agents/` that work from it. The sections below are a quick human reference; the skill is authoritative wherever they differ.

### Focus on What Matters

- **Blocking issues**: Will this break in production? Security vulnerabilities, data loss, crashes, race conditions
- **Not blocking**: Style preferences, minor naming quibbles, "I would have done it differently"

### What to Look For

- Type safety violations (`!`, `as`, `any`, `@ts-ignore`)
- **Exported types outside `/types`** - any `export type` in hooks, helpers, components, or other files is a violation; types must live in `packages/types/`
- Silent error handling - errors swallowed without logging or user feedback
- Missing edge cases - null checks, empty arrays, boundary conditions
- N+1 queries and unnecessary re-renders
- Security issues - SQL injection, XSS, exposed secrets, auth bypasses
- Breaking changes to APIs or shared interfaces - verify backward compatibility because the backend deploys faster and talks to all clients, and for a time a newer backend may be talking with a slightly outdated client (note that backward compatibility only needs to be temporary, and its cleanup should be tracked to keep the code clean)
- New `/native-recording` Swift interactions that could break existing clients - verify backward compatibility before release (because the JS client renderer in `apps/web` deploys faster than the Swift code, meaning the JS side might be talking to slightly outdated Swift code — note that backward compatibility only needs to be temporary, and its cleanup should be tracked to keep the code clean)
- Duplicate logic - new functions that replicate existing hooks or utilities (check `hooks/`, `helpers/`, and `/*` packages)

### What to Skip

- Don't nitpick formatting (Prettier handles it)
- Don't manually hunt for dead code or unused exports (`bun run knip` catches unused files, exports, and types, and gates CI)
- Don't request changes you wouldn't mass-fix across the codebase
- Don't block on missing tests unless the code is genuinely risky

### Tone

- Be direct and specific - "This will crash if `user` is null" not "Maybe consider handling the null case?"
- Suggest fixes, not just problems
- Distinguish "must fix" from "consider for future"
