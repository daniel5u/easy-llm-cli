import sys

TODO_FILE = "todos.txt"

def add_todo(task):
    with open(TODO_FILE, "a") as f:
        f.write(task + "\n")
    print(f"Added: {task}")

def list_todos():
    try:
        with open(TODO_FILE, "r") as f:
            todos = f.readlines()
            if not todos:
                print("No todos yet!")
                return
            for i, todo in enumerate(todos, 1):
                print(f"{i}. {todo.strip()}")
    except FileNotFoundError:
        print("No todos yet!")

def main():
    if len(sys.argv) < 2:
        print("Usage: python todo.py [add <task> | list]")
        return

    command = sys.argv[1]
    
    if command == "add" and len(sys.argv) > 2:
        task = " ".join(sys.argv[2:])
        add_todo(task)
    elif command == "list":
        list_todos()
    else:
        print("Usage: python todo.py [add <task> | list]")

if __name__ == "__main__":
    main()