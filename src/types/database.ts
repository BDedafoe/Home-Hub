export type Household = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type Task = {
  id: string;
  household_id: string;
  title: string;
  status: "open" | "done" | "archived";
  priority: "low" | "normal" | "high";
  due_date: string | null;
};

export type GroceryItem = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  checked: boolean;
};
