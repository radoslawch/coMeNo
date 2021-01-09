function checkError(error) {
  if (error) {
    console.error("coMeNoOpt: " + error);
  }
}

document.onreadystatechange = function () {
  if (document.readyState == 'complete') {
    //initialize when ready
    coMeNoOnLoad();
  }
}

function coMeNoOnLoad() {
  document.getElementById('removedCoMeNoToggle').onclick = function () {
    var t = document.getElementById('removedCoMeNoList');
    if (t.hidden == false) {
      t.hidden = true;
    } else {
      t.hidden = false;
    }

    var t = document.getElementById('removedCoMeNoInfo');
    if (t.hidden == false) {
      t.hidden = true;
    } else {
      t.hidden = false;
    }

    var t = document.getElementById('removedCoMeNoPurgeAll');
    if (t.hidden == false) {
      t.hidden = true;
    } else {
      t.hidden = false;
    }
  }

  document.getElementById('removedCoMeNoPurgeAll').onclick = purgeAll;

  document.getElementById('addNewNote').onclick = addNewNote;

  document.getElementById('zalgoCheckbox').onclick = toggleZalgo;

  browser.storage.sync.get('notesArray', populateCoMeNoList);
  browser.storage.sync.get('removedNotesArray', populateRemovedCoMeNoList);
  browser.storage.sync.get('zalgoCheckbox', populateZalgoCheckbox);
}
var notesArray = new Array();
var removedNotesArray = new Array();

// removes exisiting table
// and generates new one with exising notes
function populateCoMeNoList(result) {
  var table = document.createElement('table');
  var list = document.getElementById('coMeNoList');
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  list.appendChild(table);

  if (typeof result.notesArray != 'undefined' && result.notesArray.length > 0) {
    notesArray = result.notesArray;
  } else if (result.length > 0) {
    notesArray = result;
  } else {
    return;
  }

  for (var note of notesArray) {
    var tr = document.createElement('tr');
    tr.setAttribute('id', note.id);
    table.appendChild(tr);

    var td = document.createElement('td');
    td.style["width"] = "100%";
    td.style["text-align"] = "center";
    var ta = document.createElement('textarea');
    ta.value = note.content;
    ta.style["width"] = "99%";
    ta.style["resize"] = "vertical";
    ta.style["height"] = "2em";
    ta.onblur = function () {
      edit(this.parentElement.parentElement.id, this.value)
      this.style["height"] = "2em";
    };
    ta.onfocus = function () {
      this.style["height"] = "6em";
    }
    td.appendChild(ta);
    tr.appendChild(td);

    var td = document.createElement('td');
    td.innerHTML = '<button>remove</button>';
    td.style["vertical-align"] = "top";
    td.style["padding-top"] = "0.5em";
    td.onclick = function () { remove(this.parentElement.id) };
    tr.appendChild(td);
  }
}

// removes exisiting table
// and generates new one with exising removed notes
function populateRemovedCoMeNoList(result) {

  var table = document.createElement('table');
  var list = document.getElementById('removedCoMeNoList');
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  list.appendChild(table);

  if (typeof result.removedNotesArray != 'undefined' &&
    result.removedNotesArray.length > 0) {
    removedNotesArray = result.removedNotesArray;
  } else if (result.length > 0) {
    removedNotesArray = result;
  } else {
    return;
  }

  for (var note of removedNotesArray) {
    var tr = document.createElement('tr');
    tr.setAttribute('id', note.id + '_removed');
    table.appendChild(tr);


    var td = document.createElement('td');
    td.style["width"] = "100%";
    td.style["text-align"] = "center";
    var ta = document.createElement('textarea');
    ta.value = note.content;
    ta.style["width"] = "99%";
    ta.onblur = function () {
      edit(this.parentElement.parentElement.id, this.value)
    };
    td.appendChild(ta);
    tr.appendChild(td);

    var td = document.createElement('td');
    td.innerHTML = '<button>recover</button>';
    td.onclick = function () { recover(this.parentElement.id) };
    tr.appendChild(td);

    var td = document.createElement('td');
    td.innerHTML = '<button>purge</button>';
    td.onclick = function () { purge(this.parentElement.id) };
    tr.appendChild(td);
  }
}

// saves edited note
function edit(id, content) {
  for (var i = 0; i < notesArray.length; i++) {
    if (notesArray[i].id == id) break;
  }
  notesArray[i].content = content;
  chrome.storage.sync.set({ notesArray: notesArray }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    }, checkError);
  });

}

justClicked = 0;

// removes a note by moving it to 'removed' list
function remove(id) {
  setTimeout(function () {
    justClicked = 0;
  }, 100);
  if (justClicked) return;
  justClicked = 1;

  //find note index by it's id
  for (var i = 0; i < notesArray.length; i++) {
    if (notesArray[i].id == id) break;
  }

  addNote(removedNotesArray, notesArray.splice(i, 1)[0]);
  populateCoMeNoList(notesArray);
  populateRemovedCoMeNoList(removedNotesArray);
  chrome.storage.sync.set({
    notesArray: notesArray,
    removedNotesArray: removedNotesArray
  }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    });
  });
}

// recover a note back to main list
function recover(id) {
  setTimeout(function () {
    justClicked = 0;
  }, 100);
  if (justClicked) return;
  justClicked = 1;

  //find note index by it's id
  var i;
  for (i = 0; i < removedNotesArray.length; i++) {
    if (removedNotesArray[i].id == parseInt(id)) break;
  }

  addNote(notesArray, removedNotesArray.splice(i, 1)[0]);
  populateCoMeNoList(notesArray);
  populateRemovedCoMeNoList(removedNotesArray);
  chrome.storage.sync.set({
    notesArray: notesArray,
    removedNotesArray: removedNotesArray
  }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    });
  });
}

// purge removed note so it can't be recovered
function purge(id) {
  setTimeout(function () {
    justClicked = 0;
  }, 100);
  if (justClicked) return;
  justClicked = 1;

  //find note index by it's id
  var i;
  for (i = 0; i < removedNotesArray.length; i++) {
    if (removedNotesArray[i].id == parseInt(id)) {
      removedNotesArray.pop(i);
      break;
    }
  }


  populateRemovedCoMeNoList(removedNotesArray);
  chrome.storage.sync.set({
    removedNotesArray: removedNotesArray
  }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    });
  });
}

// purge all removed notes so they can't be recovered
function purgeAll() {
  if (window.confirm("are you sure?")) {

    setTimeout(function () {
      justClicked = 0;
    }, 100);
    if (justClicked) return;
    justClicked = 1;

    removedNotesArray = new Array();

    populateRemovedCoMeNoList(removedNotesArray);
    chrome.storage.sync.set({
      removedNotesArray: removedNotesArray
    }, function () {
      chrome.runtime.sendMessage({
        name: 'refreshCoMeNo'
      });
    });
  };
}

// add note to chosen array
function addNote(arr, note) {
  if (arr.length > 0) {
    // if any note exists add new with id one higher than last element of
    // notesArray
    arr[arr.length] = {
      id: arr[arr.length - 1].id + 1,
      content: note.content
    };
  } else {
    // if there are no notes yet add new with id = 0
    arr[arr.length] = {
      id: 0,
      content: note.content
    };
  }
}

// add new note from scratch
function addNewNote() {
  note = {
    content: ""
  }
  addNote(notesArray, note);
  populateCoMeNoList(notesArray);
  populateRemovedCoMeNoList(removedNotesArray);
  chrome.storage.sync.set({
    notesArray: notesArray,
    removedNotesArray: removedNotesArray
  }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    });
  });
}

// stops from making linebreaks in a note
// disabled
function divContentEditable(e) {
  if (e.keyCode === 13) {
    //e.preventDefault();
    return false;
  }
};
document.addEventListener('keydown', divContentEditable, false);

function populateZalgoCheckbox(result) {
  document.getElementById('zalgoCheckbox').checked = result.zalgoCheckbox;
}

function toggleZalgo() {
  chrome.storage.sync.set({ zalgoCheckbox: document.getElementById('zalgoCheckbox').checked }, function () {
    chrome.runtime.sendMessage({
      name: 'refreshCoMeNo'
    }, checkError);
  });
}