# /component - Create a New Component

Create a new React component following RAGESTATE codebase patterns.

## Usage
```
/component ComponentName [location]
```

## Instructions

When creating a component:

1. **File Location**:
   - Shared components: `src/app/components/`
   - Feature-specific: `src/app/[feature]/components/`
   - Use `.jsx` extension

2. **Component Template**:
```jsx
'use client';

import { memo } from 'react';

/**
 * @typedef {Object} ComponentNameProps
 * @property {string} propName - Description
 */

/**
 * Brief description of what this component does
 * @param {ComponentNameProps} props
 */
function ComponentName({ propName }) {
  return (
    <div className="bg-[var(--bg-elev-1)] text-[var(--text-primary)]">
      {/* Component content */}
    </div>
  );
}

export default memo(ComponentName);
```

3. **Styling Rules**:
   - Use Tailwind CSS classes
   - Use CSS variables for colors: `var(--bg-elev-1)`, `var(--text-primary)`, etc.
   - Never hardcode colors
   - Support dark mode automatically via CSS variables

4. **Common CSS Variable Mappings**:
   - Background: `bg-[var(--bg-root)]`, `bg-[var(--bg-elev-1)]`, `bg-[var(--bg-elev-2)]`
   - Text: `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-tertiary)]`
   - Border: `border-[var(--border-subtle)]`
   - Accent: `bg-[var(--accent)]`, `text-[var(--accent)]`

5. **JSDoc Types**: Always use JSDoc for prop types, not TypeScript

6. **Memoization**: Wrap with `memo()` for performance optimization

7. **Imports**: Use path aliases (`@components/`, `@lib/`, etc.)

Ask the user for:
- Component name
- What props it needs
- Where it should be located
- What it should render/do
