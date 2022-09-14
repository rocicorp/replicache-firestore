export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  sort: number;
};

export type TodoUpdate = Pick<Todo, "id"> & Partial<Todo>;

export type TodoEntry = {
  todo: Todo;
  spaceID: string;
  deleted: boolean;
  version: number;
};
