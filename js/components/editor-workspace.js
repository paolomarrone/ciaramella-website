class CiaramellaWorkspace extends HTMLElement {
  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.innerHTML = `
      <div class="tabs is-boxed is-centered is-normal workspace-tabs">
        <ul>
          <li class="workspace-new-tab">
            <button type="button" class="workspace-add-button" aria-label="New tab">
              <span>+</span>
            </button>
          </li>
        </ul>
      </div>
      <div class="workspace-editors"></div>
    `;

    this.tabList = this.querySelector(".workspace-tabs ul");
    this.newTabItem = this.querySelector(".workspace-new-tab");
    this.editorHost = this.querySelector(".workspace-editors");
    this.newTabButton = this.querySelector(".workspace-add-button");

    this.newTabButton.addEventListener("click", () => {
      this.createTab();
    });

    this.createTab();
  }

  createTab(title) {
    var safeTitle = title || "Untitled.crm";
    var item = document.createElement("li");
    var tabButton = document.createElement("button");
    var titleSpan = document.createElement("span");
    var closeButton = document.createElement("button");
    var editor = document.createElement("ciaramella-editor");

    item.className = "workspace-tab";
    tabButton.type = "button";
    tabButton.className = "workspace-tab-button";
    titleSpan.textContent = safeTitle;
    closeButton.type = "button";
    closeButton.className = "tab-close has-text-danger";
    closeButton.setAttribute("aria-label", "Close tab");

    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.closeTab(item);
    });

    tabButton.addEventListener("click", () => {
      this.activateTab(item);
    });

    tabButton.appendChild(titleSpan);
    tabButton.appendChild(document.createTextNode(" "));
    tabButton.appendChild(closeButton);
    item.appendChild(tabButton);
    item.editor = editor;

    editor.hidden = true;
    this.tabList.insertBefore(item, this.newTabItem);
    this.editorHost.appendChild(editor);

    this.activateTab(item);
    return editor;
  }

  closeTab(item) {
    var wasActive = item.classList.contains("is-active");
    var fallback;

    if (!item || !item.editor) {
      return;
    }

    fallback = item.previousElementSibling;
    if (!fallback || fallback === this.newTabItem) {
      fallback = item.nextElementSibling;
    }

    item.editor.remove();
    item.remove();

    if (!this.getActiveEditor() || wasActive) {
      if (fallback && fallback !== this.newTabItem) {
        this.activateTab(fallback);
      } else {
        this.createTab();
      }
    }
  }

  activateTab(item) {
    var tabs = Array.from(this.querySelectorAll(".workspace-tab"));

    tabs.forEach(function (tab) {
      tab.classList.remove("is-active");
      if (tab.editor) {
        tab.editor.hidden = true;
      }
    });

    item.classList.add("is-active");
    item.editor.hidden = false;
    item.editor.focusEditor();
  }

  getTabs() {
    return Array.from(this.querySelectorAll(".workspace-tab"));
  }

  getActiveEditor() {
    var activeTab = this.querySelector(".workspace-tab.is-active");
    return activeTab ? activeTab.editor : null;
  }

  getEditorForExample(title) {
    var activeEditor = this.getActiveEditor();

    if (!activeEditor) {
      return this.createTab(title);
    }

    if (activeEditor.isBlank()) {
      activeEditor.focusEditor();
      return activeEditor;
    }

    return this.createTab(title);
  }
}

customElements.define("ciaramella-workspace", CiaramellaWorkspace);
