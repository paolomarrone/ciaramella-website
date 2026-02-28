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
    workspace: document.getElementById("workspace"),
    compilePlayButton: document.getElementById("compilePlayButton"),
    compileViewButton: document.getElementById("compileViewButton"),
    console: document.getElementById("consoleTA"),
    plugin: document.getElementById("pluginControls"),
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
  var text = message || "";
  elements.console.value = text;
  elements.console.textContent = text;
  elements.console.defaultValue = text;
}

function setExportError(message) {
  elements.exportConsole.textContent = message || "Choose a target language and compile to export.";
  elements.exportConsole.classList.remove("is-success");
  elements.exportConsole.classList.add("is-danger", "is-light");
}

function setExportMessage(message) {
  elements.exportConsole.textContent = message || "Choose a target language and compile to export.";
  elements.exportConsole.classList.remove("is-danger", "is-light");
  elements.exportConsole.classList.add("is-success");
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

function loadExample(id) {
  var ted = elements.workspace.getEditorForExample(id + ".crm");

  ted.setCode(codeExamples[id].code);
  ted.setInitialBlock(codeExamples[id].ib);
  ted.setControlInputs(codeExamples[id].cs);
  ted.focusEditor();
}

function getActiveTED() {
  return elements.workspace.getActiveEditor();
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

function handleInput(id, value) {
  node.port.postMessage({ type: "paramChange", id: id, value: value });
}

async function play(activeTed, processorStr) {
  var controlInputs = activeTed.getControlInputs();
  var previousSource = sourceSelected;
  var scriptUrl;

  elements.plugin.setControls(controlInputs, inputInitialValues);

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

  setExportMessage("Compiling export...");
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

  setExportMessage("Compiled successfully. Generated " + output.length + " file" + (output.length === 1 ? "." : "s."));

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
  bindExampleMenu();
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
  elements.plugin.addEventListener("param-change", function (event) {
    handleInput(event.detail.id, event.detail.value);
  });
  elements.audioFile.addEventListener("change", function () {
    buttonUserFileF(elements.audioFile.files);
    elements.audioFile.value = "";
  });

  loadExamples().catch(function (e) {
    setConsoleMessage(String(e));
  });
});
