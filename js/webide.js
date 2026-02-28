var node = null;
var ctx = null;
var inputNode = null;
var streamMic = null;
var currentProcessorUrl = null;
var serverFileUrls = [
  "assets/audio/disco-beat.mp3",
  "assets/audio/drum.mp3",
  "assets/audio/saurus.mp3",
  "assets/audio/short-metal.mp3",
  "assets/audio/trance-arp.mp3",
  "assets/audio/bass.mp3",
  "assets/audio/bouncy-drum.mp3"
];
var serverFileBufferCache = [];
var serverFileSelected = 0;
var userFileBufferCache = null;
var userFileName = "";
var sourceSelected = null;
var inputInitialValues = {};
var codeExamples = {};
var elements = {};
var exampleSpecs = [
  ["amp", "amp", "level", "assets/examples/amp.crm"],
  ["lp3", "lp3", "fr", "assets/examples/lp3.crm"],
  ["eqr", "EQregalia", "low, high, peak", "assets/examples/EQregalia.crm"],
  ["wdf", "lp_filter", "cutoff", "assets/examples/lp_wdf.crm"],
  ["saw_generator", "saw_generator", "enable, frequency", "assets/examples/saw_generator.crm"],
  ["decimator", "decimator", "bypass", "assets/examples/decimator.crm"]
];

function cacheElements() {
  elements = {
    tabs: document.getElementById("tabs"),
    newTabButton: document.getElementById("newTabB"),
    textEditors: document.getElementById("textEditorsDiv"),
    compilePlayButton: document.getElementById("compilePlayButton"),
    compileViewButton: document.getElementById("compileViewButton"),
    console: document.getElementById("consoleTA"),
    plugin: document.getElementById("pluginDiv"),
    examples: document.getElementById("examples"),
    examplesDropdown: document.getElementById("examplesDropdown"),
    examplesToggle: document.querySelector("[data-toggle-examples]"),
    audioFile: document.getElementById("audiofile"),
    micButton: document.getElementById("bMic"),
    serverButton: document.getElementById("bSFi"),
    uploadButton: document.getElementById("bUFi"),
    outputButton: document.getElementById("bOut"),
    playingLabel: document.getElementById("playinglabel"),
    targetLang: document.getElementById("target_lang"),
    exportConsole: document.getElementById("exportConsoleDiv"),
    exportView: document.getElementById("exportViewDiv"),
    exportSave: document.getElementById("exportSaveDiv")
  };
}

function setConsoleMessage(message) {
  elements.console.value = message;
}

function setExportError(message) {
  if (!message) {
    elements.exportConsole.textContent = "";
    elements.exportConsole.hidden = true;
    return;
  }

  elements.exportConsole.textContent = message;
  elements.exportConsole.hidden = false;
}

function setTransportMode(mode, label) {
  elements.micButton.classList.toggle("is-success", mode === "MIC");
  elements.serverButton.classList.toggle("is-success", mode === "SFI");
  elements.uploadButton.classList.toggle("is-success", mode === "UFI");
  elements.playingLabel.textContent = label || "Playing: none";
  sourceSelected = mode;
}

function stopCurrentInput() {
  if (!inputNode) {
    return;
  }

  if (typeof inputNode.stop === "function") {
    try {
      inputNode.stop(0);
    } catch (e) {
      // Ignore invalid state when stopping an already-ended buffer source.
    }
  }

  inputNode.disconnect();
  inputNode = null;
}

function newTextEditor() {
  var editor = document.createElement("ciaramella-editor");
  elements.textEditors.appendChild(editor);
  return editor;
}

function closeTab(tab) {
  var listItem = tab.closest("li");
  var ul = listItem.parentNode;
  var wasActive = listItem.classList.contains("is-active");

  listItem.ted.parentNode.removeChild(listItem.ted);
  ul.removeChild(listItem);

  if (ul.getElementsByTagName("li").length <= 1) {
    newTab();
  } else if (wasActive) {
    selectTab(ul.children[ul.children.length - 2]);
  }
}

function newTab(title) {
  var safeTitle = title || "Untitled.crm";
  var li = document.createElement("li");
  var anchor = document.createElement("a");
  var titleSpan = document.createElement("span");
  var closeButton = document.createElement("button");

  titleSpan.textContent = safeTitle;
  closeButton.type = "button";
  closeButton.className = "tab-close has-text-danger";
  closeButton.textContent = "✖";
  closeButton.setAttribute("aria-label", "Close tab");
  closeButton.addEventListener("click", function (event) {
    event.stopPropagation();
    closeTab(closeButton);
  });

  anchor.appendChild(titleSpan);
  anchor.appendChild(document.createTextNode(" "));
  anchor.appendChild(closeButton);
  li.appendChild(anchor);

  li.addEventListener("click", function () {
    selectTab(li);
  });

  elements.newTabButton.parentNode.insertBefore(li, elements.newTabButton);

  var ted = newTextEditor();
  li.ted = ted;
  selectTab(li);

  return ted;
}

function selectTab(e) {
  var i;

  if (!e || !e.parentNode || e.classList.contains("is-active")) {
    return;
  }

  for (i = 0; i < e.parentNode.children.length - 1; i += 1) {
    e.parentNode.children[i].classList.remove("is-active");
    e.parentNode.children[i].ted.hidden = true;
  }

  e.classList.add("is-active");
  e.ted.hidden = false;
}

function loadExample(id) {
  var activeTed = getActiveTED();
  var ted;

  if (!activeTed) {
    ted = newTab(id + ".crm");
  } else if (activeTed.isBlank()) {
    ted = activeTed;
  } else {
    ted = newTab(id + ".crm");
  }

  ted.setCode(codeExamples[id].code);
  ted.setInitialBlock(codeExamples[id].ib);
  ted.setControlInputs(codeExamples[id].cs);
  ted.focusEditor();
}

function getActiveTED() {
  var i;

  for (i = 0; i < elements.tabs.children[0].children.length; i += 1) {
    var li = elements.tabs.children[0].children[i];
    if (li.classList.contains("is-active")) {
      return li.ted;
    }
  }

  return null;
}

function getInput(ted) {
  var code = ted.getCode();
  var initialBlock = ted.getInitialBlock();
  var controlInputs = ted.getControlInputs();
  var inputInitialValuesS = ted.getInitialValues();

  if (!code.trim()) {
    throw new Error("Empty code");
  }

  if (!initialBlock) {
    throw new Error("No initial block declared");
  }

  inputInitialValues = {};
  inputInitialValuesS
    .split(",")
    .map(function (entry) {
      return entry.trim();
    })
    .filter(Boolean)
    .map(function (entry) {
      return entry.split("=");
    })
    .forEach(function (entry) {
      var key = entry[0] ? entry[0].trim() : "";
      var value = entry[1] ? entry[1].trim() : "";

      if (key) {
        inputInitialValues[key] = value;
      }
    });

  return {
    code: code,
    initial_block: initialBlock,
    control_inputs: controlInputs,
    inputInitialValues: inputInitialValues
  };
}

function buildPluginControls(controlInputs) {
  var fragment = document.createDocumentFragment();
  var hasControls = false;
  var i;

  elements.plugin.innerHTML = "";

  for (i = 0; i < controlInputs.length; i += 1) {
    var controlId = controlInputs[i];

    if (!controlId) {
      continue;
    }

    hasControls = true;

    var field = document.createElement("div");
    var fieldLabel = document.createElement("div");
    var label = document.createElement("label");
    var fieldBody = document.createElement("div");
    var fieldWrap = document.createElement("div");
    var control = document.createElement("p");
    var slider = document.createElement("input");
    var initialLevel = inputInitialValues[controlId];

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
    slider.addEventListener("input", function (event) {
      handleInput(event.target);
    });

    fieldLabel.appendChild(label);
    control.appendChild(slider);
    fieldWrap.appendChild(control);
    fieldBody.appendChild(fieldWrap);
    field.appendChild(fieldLabel);
    field.appendChild(fieldBody);
    fragment.appendChild(field);
  }

  if (!hasControls) {
    var emptyState = document.createElement("div");
    emptyState.className = "field is-horizontal";
    emptyState.innerHTML = '<label class="label">No control inputs declared for this block.</label>';
    fragment.appendChild(emptyState);
  }

  elements.plugin.appendChild(fragment);
}

function compile(ted, targetLang) {
  var input = getInput(ted);
  var debug = false;

  return zampogna.compile(
    null,
    debug,
    input.code,
    input.initial_block,
    input.control_inputs,
    input.inputInitialValues,
    targetLang
  );
}

function handleInput(e) {
  node.port.postMessage({ type: "paramChange", id: e.id, value: e.value });
}

async function play(activeTed, processorStr) {
  var controlInputs = activeTed.getControlInputs();
  var previousSource = sourceSelected;
  var scriptUrl;

  buildPluginControls(controlInputs);

  scriptUrl = URL.createObjectURL(new Blob([processorStr], { type: "text/javascript" }));

  if (ctx) {
    stopCurrentInput();
    await ctx.close();
  }

  if (currentProcessorUrl) {
    URL.revokeObjectURL(currentProcessorUrl);
  }

  currentProcessorUrl = scriptUrl;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.audioWorklet.addModule(scriptUrl);

  node = new AudioWorkletNode(ctx, "PluginProcessor", { outputChannelCount: [1] });
  node.connect(ctx.destination);

  if (!previousSource) {
    await buttonServerFileF();
    return;
  }

  if (previousSource === "MIC") {
    await buttonMicF();
  } else if (previousSource === "SFI") {
    await buttonServerFileF(1);
  } else if (previousSource === "UFI") {
    buttonUserFileF([], 1);
  } else {
    await buttonServerFileF();
  }
}

function compileAndPlay() {
  var activeTed = getActiveTED();
  var output;
  var processorStr;

  try {
    output = compile(activeTed, "js");
    if (!output[1] || !output[1].str) {
      throw new Error("Unexpected compiler output for the Web Audio target.");
    }
    processorStr = output[1].str;
    setConsoleMessage("Compiled successfully.");
  } catch (e) {
    setConsoleMessage(String(e));
    return;
  }

  play(activeTed, processorStr).catch(function (e) {
    setConsoleMessage(String(e));
  });
}

function compileAndView() {
  var output;
  var o;
  var saveButton;

  setExportError("");
  elements.exportView.innerHTML = "";
  elements.exportSave.innerHTML = "";

  try {
    output = compile(getActiveTED(), elements.targetLang.value);

    for (o = 0; o < output.length; o += 1) {
      elements.exportView.innerHTML +=
        "<div>" +
        '<label class="label">' +
        output[o].name +
        "</label>" +
        '<textarea class="textarea codeView" readonly rows="19">' +
        output[o].str +
        "</textarea>" +
        "</div><br>";
    }
  } catch (e) {
    setExportError(String(e));
    return;
  }

  saveButton = document.createElement("button");
  saveButton.classList.add("button", "is-primary", "is-large");
  saveButton.textContent = "Download Files!";
  saveButton.onclick = function () {
    for (o = 0; o < output.length; o += 1) {
      downloadtext(output[o].name, output[o].str);
    }
  };

  elements.exportSave.appendChild(saveButton);
}

function downloadtext(filename, text) {
  var element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

async function buttonMicF() {
  if (!ctx) {
    setConsoleMessage("Compile a plugin first.");
    return;
  }

  if (!streamMic) {
    streamMic = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
        latency: 0.005
      }
    });
  }

  stopCurrentInput();
  inputNode = ctx.createMediaStreamSource(streamMic);
  inputNode.connect(node);

  setTransportMode("MIC", "Playing: Microphone");
}

function buttonServerFileF(again) {
  if (!ctx) {
    setConsoleMessage("Compile a plugin first.");
    return Promise.resolve();
  }

  return changeSong(again ? 0 : 1);

  function changeSong(direction) {
    serverFileSelected = (serverFileSelected + direction + serverFileUrls.length) % serverFileUrls.length;

    return downloadSong(serverFileSelected).then(function () {
      startSong(serverFileSelected);
      playPause(true);
      setTransportMode(
        "SFI",
        "Playing: " + serverFileUrls[serverFileSelected].split("/").pop()
      );
    });
  }

  function downloadSong(id) {
    if (serverFileBufferCache[id]) {
      return Promise.resolve();
    }

    return fetch(serverFileUrls[id])
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Could not load example audio file.");
        }
        return response.blob();
      })
      .then(function (blob) {
        blob.name = serverFileUrls[id];
        return blob.arrayBuffer();
      })
      .then(function (audioFile) {
        return ctx.decodeAudioData(audioFile);
      })
      .then(function (buffer) {
        serverFileBufferCache[id] = buffer;
      });
  }

  function startSong(id) {
    stopCurrentInput();
    inputNode = ctx.createBufferSource();
    inputNode.connect(node);
    inputNode.buffer = serverFileBufferCache[id];
    inputNode.loop = true;
    inputNode.start();
  }
}

function buttonUserFileF(files, again) {
  if (!ctx) {
    setConsoleMessage("Compile a plugin first.");
    return;
  }

  if (again) {
    if (!userFileBufferCache) {
      setConsoleMessage("Load an audio file first.");
      return;
    }
    reconnectUserFile();
    return;
  }

  if (!files.length) {
    return;
  }

  uploadFile(files[0]);

  function reconnectUserFile() {
    stopCurrentInput();
    inputNode = ctx.createBufferSource();
    inputNode.buffer = userFileBufferCache;
    inputNode.loop = true;
    inputNode.connect(node);
    inputNode.start(0);

    setTransportMode("UFI", "Playing: " + userFileName);
  }

  function uploadFile(file) {
    var fileReader = new FileReader();

    fileReader.readAsArrayBuffer(file);
    fileReader.onload = function (e) {
      ctx
        .decodeAudioData(e.target.result)
        .then(function (buffer) {
          userFileBufferCache = buffer;
          userFileName = file.name;
          reconnectUserFile();
        })
        .catch(function () {
          setConsoleMessage("The selected file could not be decoded.");
        });
    };
  }
}

function playPause(value) {
  if (!ctx) {
    return;
  }

  if ((value === undefined && ctx.state === "running") || value === false) {
    ctx.suspend();
    elements.outputButton.classList.add("is-warning");
    elements.outputButton.classList.remove("is-success");
  } else {
    ctx.resume();
    elements.outputButton.classList.remove("is-warning");
    elements.outputButton.classList.add("is-success");
  }
}

function bindExampleMenu() {
  var examplesItems = elements.examples.children;
  var dropdown = elements.examplesDropdown;
  var i;

  for (i = 0; i < examplesItems.length; i += 1) {
    examplesItems[i].addEventListener("click", function (e) {
      loadExample(e.target.id);
      dropdown.classList.remove("is-active");
    });
  }

  elements.examplesToggle.addEventListener("click", function (event) {
    event.stopPropagation();
    dropdown.classList.toggle("is-active");
  });

  document.addEventListener("click", function (event) {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove("is-active");
    }
  });
}

function loadExamples() {
  return Promise.all(
    exampleSpecs.map(function (example) {
      return fetch(example[3])
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not load example source files.");
          }
          return response.text();
        })
        .then(function (code) {
          codeExamples[example[0]] = {
            code: code,
            ib: example[1],
            cs: example[2]
          };
        });
    })
  );
}

window.addEventListener("load", function () {
  cacheElements();
  newTab();
  bindExampleMenu();
  elements.newTabButton.addEventListener("click", function () {
    newTab();
  });
  elements.compilePlayButton.addEventListener("click", compileAndPlay);
  elements.compileViewButton.addEventListener("click", compileAndView);
  elements.micButton.addEventListener("click", function () {
    buttonMicF().catch(function (e) {
      setConsoleMessage(String(e));
    });
  });
  elements.serverButton.addEventListener("click", function () {
    buttonServerFileF().catch(function (e) {
      setConsoleMessage(String(e));
    });
  });
  elements.uploadButton.addEventListener("click", function () {
    elements.audioFile.click();
  });
  elements.outputButton.addEventListener("click", function () {
    playPause();
  });
  elements.audioFile.addEventListener("change", function () {
    buttonUserFileF(elements.audioFile.files);
    elements.audioFile.value = "";
  });

  loadExamples().catch(function (e) {
    setConsoleMessage(String(e));
  });
});
