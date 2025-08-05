import tkinter as tk
from tkinter import scrolledtext
import os

def save_text():
    with open('note.txt', 'w', encoding='utf-8') as f:
        f.write(text_area.get("1.0", tk.END))
    print("Text saved to note.txt")

def on_closing():
    save_text()
    root.destroy()

# Create main window
root = tk.Tk()
root.title("Simple Note Taker")
root.geometry("600x400")

# Create a scrolled text area
text_area = scrolledtext.ScrolledText(root, wrap=tk.WORD, width=70, height=30)
text_area.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)

# Load existing content if note.txt exists
if os.path.exists('note.txt'):
    with open('note.txt', 'r', encoding='utf-8') as f:
        content = f.read()
        text_area.insert(tk.INSERT, content)

# Set up the save on close
root.protocol("WM_DELETE_WINDOW", on_closing)

# Run the application
root.mainloop()