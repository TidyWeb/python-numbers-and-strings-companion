# Manipulating Numbers and Strings with Python

An interactive beginner companion for practising five foundational Python topics:

1. [Basic Maths with Arithmetic Operators](basic_maths_and_arithmetic_operators/)
2. [Incrementing and Decrementing](incrementing_and_decrementing/)
3. [String Formatting](string_formatting/)
4. [String Methods](string_methods/)
5. [Dynamic String Formatting with F-Strings](dynamic_formatting_with_f_strings/)

## Open the lessons

Use the published GitHub Pages site for the simplest experience. The course opens at lesson one, and every lesson is connected through the sidebar and Previous/Next controls.

Each lesson includes an editable Python workbench. Press **Run code** to execute the example directly in your browser. The first lesson may take a few seconds to prepare Python; later loads are normally faster because the browser caches the runtime.

No Python installation, account or submission is required. Code and saved edits remain in the learner's browser.

## Browser Python

The workbench uses a pinned release of [Pyodide](https://pyodide.org/), which runs Python through WebAssembly in a Web Worker. Learner code is stopped after four seconds to protect the page from accidental endless loops.

These introductory lessons use core Python only and do not download optional scientific packages.

## Run the site locally

From the repository folder, start a small static server:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/` in a browser.

## About this companion

This independent study companion follows topics taught in Code Institute's Python and Data Analysis Libraries material. It is not an official Code Institute product.
