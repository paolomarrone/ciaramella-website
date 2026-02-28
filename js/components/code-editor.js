class CiaramellaEditor extends HTMLElement {
  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.innerHTML = `
      <section class="editor-shell">
        <div class="editor-pane">
          <div class="lineCounter" aria-hidden="true"></div>
          <textarea class="codeEditor" spellcheck="false" placeholder="Code here..."></textarea>
        </div>
        <div class="editor-controls">
          <input class="input is-danger" type="text" data-role="initial-block" title="Initial block" placeholder="Initial Block. E.g.: lowpass_filter">
          <input class="input is-warning" type="text" data-role="control-inputs" title="Control inputs" placeholder="Control inputs. E.g.: volume, cutoff, resonance">
          <input class="input is-warning" type="text" data-role="initial-values" title="Initial input values" placeholder="Initial input values. E.g.: x = 0.5, volume = 1">
        </div>
      </section>
    `;

    this.codeEditor = this.querySelector(".codeEditor");
    this.lineCounter = this.querySelector(".lineCounter");
    this.initialBlockInput = this.querySelector('[data-role="initial-block"]');
    this.controlInputsInput = this.querySelector('[data-role="control-inputs"]');
    this.initialValuesInput = this.querySelector('[data-role="initial-values"]');

    this.codeEditor.addEventListener("input", () => {
      this.syncLineCounter();
      this.dispatchEvent(new CustomEvent("editor-change", { bubbles: true }));
    });

    this.codeEditor.addEventListener("scroll", () => {
      this.lineCounter.scrollTop = this.codeEditor.scrollTop;
    });

    this.codeEditor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        this.insertAtSelection("\t");
        return;
      }

      if (event.key === "Enter") {
        var start = this.codeEditor.selectionStart;
        var beforeCursor = this.codeEditor.value.slice(0, start);
        var lineStart = beforeCursor.lastIndexOf("\n") + 1;
        var currentLine = beforeCursor.slice(lineStart);
        var indent = currentLine.match(/^\s*/)[0];

        if (indent) {
          event.preventDefault();
          this.insertAtSelection("\n" + indent);
        }
      }
    });

    this.syncLineCounter();
  }

  insertAtSelection(text) {
    var start = this.codeEditor.selectionStart;
    var end = this.codeEditor.selectionEnd;
    var value = this.codeEditor.value;

    this.codeEditor.value = value.slice(0, start) + text + value.slice(end);
    this.codeEditor.setSelectionRange(start + text.length, start + text.length);
    this.syncLineCounter();
    this.dispatchEvent(new CustomEvent("editor-change", { bubbles: true }));
  }

  syncLineCounter() {
    var lineCount = Math.max(1, this.codeEditor.value.split("\n").length);
    var numbers = [];
    var i;

    for (i = 1; i <= lineCount; i += 1) {
      numbers.push(String(i));
    }

    this.lineCounter.textContent = numbers.join("\n");
  }

  getCode() {
    return this.codeEditor.value;
  }

  setCode(value) {
    this.codeEditor.value = value || "";
    this.syncLineCounter();
  }

  getInitialBlock() {
    return this.initialBlockInput.value.trim();
  }

  setInitialBlock(value) {
    this.initialBlockInput.value = value || "";
  }

  getControlInputs() {
    return this.controlInputsInput.value
      .split(",")
      .map(function (entry) {
        return entry.trim();
      })
      .filter(Boolean);
  }

  setControlInputs(value) {
    this.controlInputsInput.value = value || "";
  }

  getInitialValues() {
    return this.initialValuesInput.value;
  }

  setInitialValues(value) {
    this.initialValuesInput.value = value || "";
  }

  isBlank() {
    return !this.getCode().trim();
  }

  focusEditor() {
    this.codeEditor.focus();
  }
}

customElements.define("ciaramella-editor", CiaramellaEditor);
