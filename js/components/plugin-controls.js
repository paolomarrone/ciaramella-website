class CiaramellaPluginControls extends HTMLElement {
  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.renderEmpty();
  }

  renderEmpty() {
    this.innerHTML = `
      <div class="field is-horizontal">
        <label class="label">The plugin will be shown here when compiled</label>
      </div>
    `;
  }

  setControls(controlIds, initialValues) {
    var controls = Array.isArray(controlIds) ? controlIds.filter(Boolean) : [];
    var values = initialValues || {};
    var fragment = document.createDocumentFragment();

    this.innerHTML = "";

    if (!controls.length) {
      this.innerHTML = `
        <div class="field is-horizontal">
          <label class="label">No control inputs declared for this block.</label>
        </div>
      `;
      return;
    }

    controls.forEach((controlId) => {
      var field = document.createElement("div");
      var fieldLabel = document.createElement("div");
      var label = document.createElement("label");
      var fieldBody = document.createElement("div");
      var fieldWrap = document.createElement("div");
      var control = document.createElement("p");
      var slider = document.createElement("input");
      var initialLevel = values[controlId];

      if (initialLevel === undefined) {
        initialLevel = 0;
      }

      field.className = "field is-horizontal";
      fieldLabel.className = "field-label is-normal";
      label.className = "label";
      label.textContent = controlId;
      fieldBody.className = "field-body";
      fieldWrap.className = "field";
      control.className = "control";
      slider.className = "input is-primary";
      slider.type = "range";
      slider.id = controlId;
      slider.name = controlId;
      slider.min = "0";
      slider.max = "1";
      slider.step = "any";
      slider.value = String(initialLevel);
      slider.addEventListener("input", () => {
        this.dispatchEvent(
          new CustomEvent("param-change", {
            bubbles: true,
            detail: {
              id: controlId,
              value: slider.value
            }
          })
        );
      });

      fieldLabel.appendChild(label);
      control.appendChild(slider);
      fieldWrap.appendChild(control);
      fieldBody.appendChild(fieldWrap);
      field.appendChild(fieldLabel);
      field.appendChild(fieldBody);
      fragment.appendChild(field);
    });

    this.appendChild(fragment);
  }
}

customElements.define("ciaramella-plugin-controls", CiaramellaPluginControls);
