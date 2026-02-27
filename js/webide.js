var node;
var ctx;
var inputNode;
var streamMic;
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

function newTextEditor() {
  var codeEditor = document.createElement("textarea");
  var lineCounter = document.createElement("textarea");

  lineCounter.readOnly = true;
  lineCounter.classList.add("lineCounter");
  codeEditor.placeholder = "Code here...";
  codeEditor.spellcheck = false;
  codeEditor.classList.add("codeEditor");

  codeEditor.addEventListener("scroll", function () {
    lineCounter.scrollTop = codeEditor.scrollTop;
    lineCounter.scrollLeft = codeEditor.scrollLeft;
  });

  codeEditor.addEventListener("keydown", function (e) {
    var keyCode = e.keyCode;
    var value = codeEditor.value;
    var selectionStart = codeEditor.selectionStart;
    var selectionEnd = codeEditor.selectionEnd;

    if (keyCode === 9) {
      e.preventDefault();
      codeEditor.value = value.slice(0, selectionStart) + "\t" + value.slice(selectionEnd);
      codeEditor.setSelectionRange(selectionStart + 1, selectionStart + 1);
    }
  });

  var lineCountCache = 0;

  function lineCounterRefresh() {
    var lineCount = codeEditor.value.split("\n").length;
    var outarr = [];

    if (lineCountCache !== lineCount) {
      for (var x = 0; x < lineCount; x += 1) {
        outarr[x] = String(x + 1) + " ";
      }
      lineCounter.value = outarr.join("\n");
    }

    lineCountCache = lineCount;
  }

  codeEditor.addEventListener("input", lineCounterRefresh);
  lineCounterRefresh();

  var textEditorDiv = document.createElement("div");
  textEditorDiv.classList.add("editor-pane");
  textEditorDiv.appendChild(lineCounter);
  textEditorDiv.appendChild(codeEditor);

  var compileInputDiv = document.createElement("div");
  compileInputDiv.classList.add("editor-controls");
  compileInputDiv.innerHTML =
    '<input class="input is-danger" type="text" title="Initial block" placeholder="Initial Block. E.g.: lowpass_filter">' +
    '<input class="input is-warning" type="text" title="Control inputs" placeholder="Control inputs. E.g.: volume, cutoff, resonance">' +
    '<input class="input is-warning" type="text" title="Initial input values" placeholder="Initial input values. E.g.: x = 0.5, volume = 1">';

  var editorShell = document.createElement("section");
  editorShell.classList.add("editor-shell");
  editorShell.appendChild(textEditorDiv);
  editorShell.appendChild(compileInputDiv);

  document.getElementById("textEditorsDiv").appendChild(editorShell);

  return editorShell;
}

function closeTab(tab) {
  var ul = tab.parentNode.parentNode.parentNode;
  var listItem = tab.parentNode.parentNode;
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
  var newTabB = document.getElementById("newTabB");
  var li = document.createElement("li");

  li.onclick = function () {
    selectTab(li);
  };
  li.innerHTML =
    "<a><span>" +
    safeTitle +
    "</span>&nbsp; <button type=\"button\" class=\"tab-close has-text-danger\" onclick=\"closeTab(this)\">✖</button></a>";

  newTabB.parentNode.insertBefore(li, newTabB);

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
  var codeArea = activeTed.children[0].children[1];
  var ted;

  if (!codeArea.value) {
    ted = activeTed;
  } else {
    ted = newTab(id + ".crm");
  }

  ted.children[0].children[1].value = codeExamples[id].code;
  ted.children[1].children[0].value = codeExamples[id].ib;
  ted.children[1].children[1].value = codeExamples[id].cs;
  ted.children[0].children[1].dispatchEvent(new Event("input"));
}

function getActiveTED() {
  var tabs = document.getElementById("tabs");
  var i;

  for (i = 0; i < tabs.children[0].children.length; i += 1) {
    var li = tabs.children[0].children[i];
    if (li.classList.contains("is-active")) {
      return li.ted;
    }
  }

  return null;
}

function getInput(ted) {
  var code = ted.children[0].children[1].value;
  var initialBlock = ted.children[1].children[0].value;
  var controlInputsS = ted.children[1].children[1].value;
  var inputInitialValuesS = ted.children[1].children[2].value;

  if (!code) {
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
    control_inputs: controlInputsS
      .split(",")
      .map(function (entry) {
        return entry.trim();
      })
      .filter(Boolean),
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

function handleInput(e) {
  node.port.postMessage({ type: "paramChange", id: e.id, value: e.value });
}

async function play(activeTed, processorStr) {
  var pluginDiv = document.getElementById("pluginDiv");
  var controlInputsS = activeTed.children[1].children[1].value;
  var controlInputs = controlInputsS.split(",").map(function (value) {
    return value.trim();
  });
  var c;

  pluginDiv.innerHTML = "";

  for (c = 0; c < controlInputs.length; c += 1) {
    if (!controlInputs[c]) {
      continue;
    }

    var initialLevel = inputInitialValues[controlInputs[c]];
    if (initialLevel === undefined) {
      initialLevel = 0;
    }

    pluginDiv.innerHTML +=
      '<div class="field is-horizontal">' +
      '<div class="field-label is-normal"><label class="label">' +
      controlInputs[c] +
      "</label></div>" +
      '<div class="field-body"><div class="field"><p class="control">' +
      '<input class="input is-primary" type="range" id="' +
      controlInputs[c] +
      '" name="' +
      controlInputs[c] +
      '" min="0" max="1" value="' +
      initialLevel +
      '" step="any" oninput="handleInput(this)">' +
      "</p></div></div></div>";
  }

  var scriptUrl = URL.createObjectURL(new Blob([processorStr], { type: "text/javascript" }));

  if (ctx) {
    await ctx.close();
  }

  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.audioWorklet.addModule(scriptUrl);

  node = new AudioWorkletNode(ctx, "PluginProcessor", { outputChannelCount: [1] });
  node.connect(ctx.destination);

  if (!inputNode) {
    await buttonServerFileF();
    return;
  }

  if (sourceSelected === "MIC") {
    buttonMicF();
  } else if (sourceSelected === "SFI") {
    buttonServerFileF(1);
  } else if (sourceSelected === "UFI") {
    buttonUserFileF([], 1);
  } else if (inputNode) {
    inputNode.connect(node);
  }
}

function compileAndPlay() {
  var activeTed = getActiveTED();
  var processorStr;

  try {
    processorStr = compile(activeTed, "js")[1].str;
    document.getElementById("consoleTA").value = "Compiled successfully";
  } catch (e) {
    document.getElementById("consoleTA").value = String(e);
    return;
  }

  play(activeTed, processorStr).catch(function (e) {
    document.getElementById("consoleTA").value = String(e);
  });
}

function compileAndView() {
  var exportConsoleDiv = document.getElementById("exportConsoleDiv");
  var exportViewDiv = document.getElementById("exportViewDiv");
  var exportSaveDiv = document.getElementById("exportSaveDiv");
  var output;
  var o;
  var saveButton;

  exportConsoleDiv.textContent = "";
  exportConsoleDiv.hidden = true;
  exportViewDiv.innerHTML = "";
  exportSaveDiv.innerHTML = "";

  try {
    output = compile(getActiveTED(), document.getElementById("target_lang").value);

    for (o = 0; o < output.length; o += 1) {
      exportViewDiv.innerHTML +=
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
    exportConsoleDiv.textContent = String(e);
    exportConsoleDiv.hidden = false;
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

  exportSaveDiv.appendChild(saveButton);
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

  if (inputNode) {
    inputNode.disconnect();
  }

  inputNode = ctx.createMediaStreamSource(streamMic);
  inputNode.connect(node);

  document.getElementById("bMic").classList.add("is-success");
  document.getElementById("bSFi").classList.remove("is-success");
  document.getElementById("bUFi").classList.remove("is-success");
  document.getElementById("playinglabel").textContent = "Playing: Microphone";
  sourceSelected = "MIC";
}

function buttonServerFileF(again) {
  if (!ctx) {
    return Promise.resolve();
  }

  return changeSong(again ? 0 : 1);

  function changeSong(direction) {
    serverFileSelected = (serverFileSelected + direction + serverFileUrls.length) % serverFileUrls.length;

    return downloadSong(serverFileSelected).then(function () {
      startSong(serverFileSelected);
      playPause(true);
      document.getElementById("bMic").classList.remove("is-success");
      document.getElementById("bSFi").classList.add("is-success");
      document.getElementById("bUFi").classList.remove("is-success");
      document.getElementById("playinglabel").textContent =
        "Playing: " + serverFileUrls[serverFileSelected].split("/").pop();
      sourceSelected = "SFI";
    });
  }

  function downloadSong(id) {
    if (serverFileBufferCache[id]) {
      return Promise.resolve();
    }

    return fetch(serverFileUrls[id])
      .then(function (response) {
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
    if (inputNode) {
      inputNode.disconnect();
    }

    inputNode = ctx.createBufferSource();
    inputNode.connect(node);
    inputNode.buffer = serverFileBufferCache[id];
    inputNode.loop = true;
    inputNode.start();
  }
}

function buttonUserFileF(files, again) {
  if (!ctx) {
    return;
  }

  if (again) {
    reconnectUserFile();
    return;
  }

  if (!files.length) {
    return;
  }

  uploadFile(files[0]);

  function reconnectUserFile() {
    if (inputNode) {
      inputNode.disconnect();
    }

    inputNode = ctx.createBufferSource();
    inputNode.buffer = userFileBufferCache;
    inputNode.loop = true;
    inputNode.connect(node);
    inputNode.start(0);

    document.getElementById("bMic").classList.remove("is-success");
    document.getElementById("bSFi").classList.remove("is-success");
    document.getElementById("bUFi").classList.add("is-success");
    document.getElementById("playinglabel").textContent = "Playing: " + userFileName;
    sourceSelected = "UFI";
  }

  function uploadFile(file) {
    var fileReader = new FileReader();

    fileReader.readAsArrayBuffer(file);
    fileReader.onload = function (e) {
      ctx.decodeAudioData(e.target.result).then(function (buffer) {
        userFileBufferCache = buffer;
        userFileName = file.name;
        reconnectUserFile();
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
    document.getElementById("bOut").classList.add("is-warning");
    document.getElementById("bOut").classList.remove("is-success");
  } else {
    ctx.resume();
    document.getElementById("bOut").classList.remove("is-warning");
    document.getElementById("bOut").classList.add("is-success");
  }
}

function bindExampleMenu() {
  var examplesItems = document.getElementById("examples").children;
  var dropdown = document.getElementById("examplesDropdown");
  var i;

  for (i = 0; i < examplesItems.length; i += 1) {
    examplesItems[i].onclick = function (e) {
      loadExample(e.target.id);
      dropdown.classList.remove("is-active");
    };
  }

  document.querySelector("[data-toggle-examples]").addEventListener("click", function (event) {
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
  var examples = [
    ["amp", "amp", "level", "assets/examples/amp.crm"],
    ["lp3", "lp3", "fr", "assets/examples/lp3.crm"],
    ["eqr", "EQregalia", "low, high, peak", "assets/examples/EQregalia.crm"],
    ["wdf", "lp_filter", "cutoff", "assets/examples/lp_wdf.crm"],
    ["saw_generator", "saw_generator", "enable, frequency", "assets/examples/saw_generator.crm"],
    ["decimator", "decimator", "bypass", "assets/examples/decimator.crm"]
  ];

  return Promise.all(
    examples.map(function (example) {
      return fetch(example[3])
        .then(function (response) {
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
  newTab();
  bindExampleMenu();
  loadExamples();
});
