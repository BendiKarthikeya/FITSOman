# Insight Pulse UI Components

A comprehensive React + Tailwind CSS component library for the Insight Pulse survey management platform.

## Structure

```
ui/
├── components/          # Base UI components
│   ├── Button.tsx      # Button component with variants
│   ├── Input.tsx       # Input field component
│   ├── Card.tsx        # Card components
│   ├── Checkbox.tsx    # Checkbox component
│   ├── Badge.tsx       # Badge/status indicator
│   ├── Table.tsx       # Table components
│   ├── MetricCard.tsx  # Metric display card
│   └── index.ts        # Component exports
├── layout/             # Layout components
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Navbar.tsx      # Top navigation bar
│   └── index.ts        # Layout exports
├── pages/              # Page-level components
│   ├── LoginPage.tsx   # Authentication page
│   ├── DashboardPage.tsx # Main dashboard
│   └── index.ts        # Page exports
├── styles/             # Global styles
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── README.md          # This file
```

## Usage

### Base Components

#### Button
```tsx
import { Button } from '@/ui/components';

<Button variant="primary" size="md">Click me</Button>
<Button variant="outline">Outline Button</Button>
```

#### Input
```tsx
import { Input } from '@/ui/components';

<Input 
  label="Email" 
  type="email"
  placeholder="user@example.com"
  error="Invalid email"
/>
```

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/components';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

#### Table
```tsx
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from '@/ui/components';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Layout Components

#### Sidebar
```tsx
import { Sidebar } from '@/ui/layout';

const items = [
  { label: 'Dashboard', icon: <DashboardIcon /> },
  { label: 'Surveys', icon: <SurveysIcon />, children: [...] }
];

<Sidebar items={items} />
```

#### Navbar
```tsx
import { Navbar } from '@/ui/layout';

<Navbar
  breadcrumbs={[
    { label: 'Home' },
    { label: 'Dashboard' }
  ]}
  title="Dashboard"
/>
```

### Page Components

#### LoginPage
```tsx
import { LoginPage } from '@/ui/pages';

<LoginPage />
```

#### DashboardPage
```tsx
import { DashboardPage } from '@/ui/pages';

<DashboardPage />
```

## Styling

All components use Tailwind CSS with the project's custom color scheme:
- Primary: Slate 900 (dark navy)
- Secondary: Slate 100
- Success: Green
- Warning: Yellow
- Error: Red

## Component Variants

### Button
- **variant**: `primary`, `secondary`, `outline`, `ghost`
- **size**: `sm`, `md`, `lg`

### Badge
- **variant**: `default`, `success`, `warning`, `error`, `info`

## Development

To add a new component:

1. Create the component file in `components/`
2. Export it from `components/index.ts`
3. Add usage documentation to this README
4. Use Tailwind CSS for styling
5. Follow existing patterns and conventions

## Design System

The UI is built following the Insight Pulse design system as defined in Figma. Typography uses IBM Plex Sans for consistency.

**Font Sizes**:
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px

**Spacing**:
- Uses Tailwind's standard spacing scale (4px increments)

**Shadows**:
- xs: Drop shadow with small blur
- sm: Slightly larger shadow
- md: Medium shadow for cards

## Next Steps

- [ ] Build Analytics page
- [ ] Build Surveys list page
- [ ] Create chart components (Area, Pie, Bar)
- [ ] Add form validation utilities
- [ ] Build modal/dialog components
- [ ] Create datepicker component
- [ ] Add toast/notification system
- [ ] Create theme customization system
