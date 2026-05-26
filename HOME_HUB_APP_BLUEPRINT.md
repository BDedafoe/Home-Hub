# Home Hub App Blueprint

## Product Concept

Home Hub is a private shared household app for a couple or family. It combines daily planning, finances, tasks, meals, groceries, recipes, and home maintenance in one calm dashboard.

The app should feel practical first: fast to open, easy to update from a phone, and useful at a glance.

## Recommended Stack

- Frontend and backend: Next.js with App Router
- Styling: Tailwind CSS
- Database: PostgreSQL through Supabase
- Authentication: Supabase Auth
- Hosting: Vercel
- Version control: GitHub
- Local editor: VSCode

## Core User Roles

- Household owner: creates the household, invites partner/family members, manages settings
- Household member: can view and manage shared household data

For version 1, both users can have the same permissions. Role-based permissions can be added later.

## Primary Navigation

1. Dashboard
2. Money
3. Tasks
4. Meals
5. Groceries
6. Home
7. Notes
8. Settings

## Version 1 Features

### Dashboard

Purpose: one screen for what matters today.

Widgets:

- Today’s tasks
- Upcoming bills
- This week’s meal plan
- Grocery items still needed
- Recent expenses
- Shared notes

### Money

Purpose: lightweight household finance tracking.

Features:

- Add income or expense
- Categorize expenses
- Mark expenses as shared or personal
- Track recurring bills
- Monthly budget summary
- Savings goals

Suggested categories:

- Mortgage or rent
- Utilities
- Groceries
- Dining out
- Transportation
- Pets
- Health
- Subscriptions
- Home improvement
- Entertainment
- Travel
- Miscellaneous

### Tasks

Purpose: shared to-do list and recurring home chores.

Features:

- Create task
- Assign task to a household member
- Due date
- Priority
- Status: open, done, archived
- Repeat schedule for chores

Example recurring tasks:

- Take out trash
- Change air filter
- Pay utility bill
- Water plants
- Clean fridge

### Meals and Recipes

Purpose: save favorite meals and plan the week.

Features:

- Save recipes
- Add ingredients
- Add cooking notes
- Tag recipes
- Add recipes to weekly meal plan
- Send recipe ingredients to grocery list

Useful recipe fields:

- Title
- Source URL
- Prep time
- Cook time
- Servings
- Ingredients
- Instructions
- Notes
- Tags

### Groceries

Purpose: shared live grocery list.

Features:

- Add item
- Category
- Quantity
- Store
- Needed by date
- Checked off status
- Save common staples

Suggested categories:

- Produce
- Meat and seafood
- Dairy
- Pantry
- Frozen
- Bakery
- Household
- Personal care
- Other

### Home

Purpose: home maintenance and household reference.

Features:

- Maintenance reminders
- Appliance records
- Warranty dates
- Contractor contacts
- Paint colors and room notes
- Home project wishlist

### Notes

Purpose: shared capture space.

Features:

- Quick notes
- Date ideas
- Gift ideas
- Travel ideas
- Shopping research
- Things to discuss

## App Structure

Recommended folder shape:

```txt
src/
  app/
    (auth)/
      login/
      signup/
    (app)/
      dashboard/
      money/
      tasks/
      meals/
      groceries/
      home/
      notes/
      settings/
    api/
  components/
    app-shell/
    dashboard/
    forms/
    ui/
  lib/
    supabase/
    validation/
    utils.ts
  types/
```

## Suggested Supabase Tables

### households

- id: uuid primary key
- name: text
- created_by: uuid references auth.users
- created_at: timestamp

### household_members

- id: uuid primary key
- household_id: uuid references households
- user_id: uuid references auth.users
- role: text
- created_at: timestamp

### profiles

- id: uuid primary key, references auth.users
- full_name: text
- avatar_url: text
- created_at: timestamp

### transactions

- id: uuid primary key
- household_id: uuid references households
- user_id: uuid references auth.users
- type: text
- amount: numeric
- category: text
- merchant: text
- note: text
- transaction_date: date
- created_at: timestamp

### recurring_bills

- id: uuid primary key
- household_id: uuid references households
- name: text
- amount: numeric
- category: text
- due_day: integer
- autopay: boolean
- active: boolean
- created_at: timestamp

### tasks

- id: uuid primary key
- household_id: uuid references households
- assigned_to: uuid references auth.users
- title: text
- description: text
- priority: text
- status: text
- due_date: date
- repeat_rule: text
- created_at: timestamp

### recipes

- id: uuid primary key
- household_id: uuid references households
- title: text
- source_url: text
- prep_minutes: integer
- cook_minutes: integer
- servings: integer
- instructions: text
- notes: text
- created_at: timestamp

### recipe_ingredients

- id: uuid primary key
- recipe_id: uuid references recipes
- name: text
- quantity: text
- sort_order: integer

### meal_plan_items

- id: uuid primary key
- household_id: uuid references households
- recipe_id: uuid references recipes
- meal_date: date
- meal_type: text
- notes: text

### grocery_items

- id: uuid primary key
- household_id: uuid references households
- added_by: uuid references auth.users
- name: text
- quantity: text
- category: text
- store: text
- checked: boolean
- needed_by: date
- created_at: timestamp

### home_assets

- id: uuid primary key
- household_id: uuid references households
- name: text
- category: text
- location: text
- purchase_date: date
- warranty_expires: date
- notes: text
- created_at: timestamp

### maintenance_items

- id: uuid primary key
- household_id: uuid references households
- title: text
- due_date: date
- repeat_rule: text
- status: text
- notes: text
- created_at: timestamp

### notes

- id: uuid primary key
- household_id: uuid references households
- created_by: uuid references auth.users
- title: text
- body: text
- category: text
- pinned: boolean
- created_at: timestamp

## Security Model

Use Supabase Row Level Security for every household-owned table.

Rule concept:

- A signed-in user can access a row only if they are a member of that row’s household.
- Users can only access their own profile.
- Household owners can invite or remove members.

## UI Direction

The design should feel like a polished household utility, not a marketing site.

Recommended style:

- Left sidebar on desktop
- Bottom tab bar on mobile
- Calm neutral background
- Clear status colors for money, tasks, groceries, and due dates
- Dense but friendly dashboard cards
- Quick-add buttons on every major page
- Mobile-first forms

Avoid:

- Giant landing page hero
- Decorative gradients everywhere
- Overly large cards
- Too many chart widgets in version 1

## Dashboard Layout

Desktop:

- Left sidebar navigation
- Top bar with household name and user menu
- Main grid:
  - Today
  - This week
  - Money snapshot
  - Grocery list
  - Meal plan
  - Notes

Mobile:

- Top household selector
- Scrollable dashboard sections
- Bottom navigation
- Floating quick-add button

## Key User Flows

### First-Time Setup

1. User signs up.
2. User creates household.
3. User invites partner by email.
4. App opens dashboard.

### Add Grocery Item

1. User taps quick add.
2. Selects grocery item.
3. Enters item name, quantity, category, and optional store.
4. Item appears on shared grocery list instantly.

### Add Recipe to Grocery List

1. User opens a recipe.
2. User clicks add ingredients to grocery list.
3. App creates grocery items for unchecked ingredients.

### Track Expense

1. User opens Money.
2. Adds transaction.
3. Selects category and amount.
4. Monthly summary updates.

### Complete Task

1. User opens Dashboard or Tasks.
2. Checks off task.
3. If recurring, app creates or schedules the next occurrence.

## Development Milestones

### Milestone 1: Foundation

- Create Next.js app
- Install Tailwind CSS
- Connect Supabase client
- Add login and signup
- Add protected app layout
- Add household creation

### Milestone 2: Shared Data

- Add database schema
- Add Row Level Security policies
- Add household membership checks
- Add dashboard shell

### Milestone 3: Core Modules

- Tasks
- Groceries
- Transactions
- Recipes

### Milestone 4: Connected Features

- Recipe ingredients to grocery list
- Recurring bills
- Recurring tasks
- Dashboard summaries

### Milestone 5: Polish and Deploy

- Responsive UI
- Empty states
- Loading states
- Error states
- Vercel deployment
- Supabase production environment variables

## Environment Variables

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only use `SUPABASE_SERVICE_ROLE_KEY` on the server. Never expose it to the browser.

## Suggested GitHub Workflow

- main: production branch
- feature branches for each module
- pull requests before merging
- deploy previews through Vercel

Example branches:

- feature/auth
- feature/dashboard
- feature/tasks
- feature/groceries
- feature/money
- feature/recipes

## Best MVP Build Order

1. Authentication
2. Household setup
3. App shell and navigation
4. Dashboard
5. Groceries
6. Tasks
7. Money
8. Recipes
9. Meal planning
10. Home maintenance

This order gets the app useful quickly while keeping the harder connected features for later.

