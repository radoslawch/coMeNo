function checkError(error) {
  if (error) {
    console.error("coMeNo: " + error);
  }
}

// purge removed notes from previous Firefox session
browser.storage.sync.remove('removedNotesArray');

// sends a message to the content script
function sendToActiveTab(message) {
  chrome.tabs.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT,
    active: true
    }, function (tabs) {
      for (var i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, message, checkError);
      }
    }
  );
}

// receives a message from te content script
// and reacts to it
chrome.runtime.onMessage.addListener(
  function (message, sender, sendResponse) {
    if (message.name == "noteCopied") {
      chrome.notifications.create(
        {
          "type": "basic",
          "title": "coMeNo",
          "message": message.messageOverride || "Note was copied to clipboard."
        }
      )
    } else if (message.name == "refreshCoMeNo") {
      chrome.storage.sync.get("zalgoCheckbox", populateCoMeNoFromStorage1stStep);
    }
  }
);

chrome.storage.sync.get("zalgoCheckbox", populateCoMeNoFromStorage1stStep);

// generates context menu
function populateCoMeNoFromStorage1stStep(result) {
  chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: "saveNote",
    title: "save note",
    contexts: ["link", "selection"]
  });

  chrome.contextMenus.create({
    id: "optionsPage",
    title: "edit notes (open options)"
  });
  
  if (result.zalgoCheckbox) {
    chrome.contextMenus.create({
      id: "zalgo",
      title: "H̵̡͟͠È̷͘͏ ̴̷̵̛͟C̷̡̀O̶͞M̵͘͜͞E̡S̀͞",
      contexts: ["selection"]
    });
  }
  chrome.storage.sync.get("notesArray", populateCoMeNoFromStorage2ndStep);
}

// generates context menu
function populateCoMeNoFromStorage2ndStep(result) {

  if (result.notesArray) {
    notesArray = result.notesArray;
    populateCoMeNoFromVariable();
  } else {
    notesArray = new Array();
  }
}

// populates context menu with notes
function populateCoMeNoFromVariable() {
  chrome.contextMenus.create({
    id: "separator",
    type: "separator",
    contexts: ["editable", "page", "frame"]
  });
  for (var i = 0; i < notesArray.length; i++) {
    chrome.contextMenus.create({
      id: notesArray[i].id.toString(),
      title: notesArray[i].content.slice(0, 24),
      contexts: ["editable", "page", "frame"]
    });
  }
}

// updates context menu with a new note
function addNewCoMeNo() {
  chrome.contextMenus.create({
    id: notesArray[notesArray.length - 1].id.toString(),
    title: notesArray[notesArray.length - 1].content.slice(0, 24),
    contexts: ["editable", "page", "frame"]
  });
}

chrome.contextMenus.onClicked.addListener(onClicked);

// reacts on context menu click
function onClicked(info, tab) {
  // iterate over notes (id is not equal to position)
  for (var i = 0; i < notesArray.length; i++) {
    if (notesArray[i].id == info.menuItemId) break;
  }

  if (info.menuItemId == "saveNote") {
    saveNote();
  } else if (info.menuItemId == "optionsPage") {
    browser.runtime.openOptionsPage();
  } else if (info.menuItemId == "zalgo") {
    if (info.selectionText != "" && typeof info.selectionText != "undefined") {
      // saving selection
      content = info.selectionText;
      var request = new XMLHttpRequest();
      request.open('GET', 'https://zalgo.io/api?text=' + content, true);
      request.onload = function () {        
        copyOrPasteNote(this.response);        
      }
      request.send();
    }
  } else {
    copyOrPasteNote(notesArray[i].content);
  }  

  function saveNote(){    
    // saving selection as a new note
    if (info.selectionText != "" && typeof info.selectionText != "undefined") {
      // saving selection
      content = info.selectionText;
    } else if (info.linkUrl != "" && typeof info.linkUrl != "undefined") {
      // saving url
      content = info.linkUrl;
    }

    if (notesArray.length > 0) {
      // if any note exists add new with id one higher than last element of
      // notesArray
      notesArray[notesArray.length] = {
        id: notesArray[notesArray.length - 1].id + 1,
        content: content
      };
    } else {
      // if there are no notes yet add new with id = 0
      notesArray[notesArray.length] = {
        id: 0,
        content: content
      };
    }
    chrome.storage.sync.set({ notesArray: notesArray }, addNewCoMeNo);
  }

  function copyOrPasteNote(data){
    if (info.editable) {
      // if user pressed existing note
      // paste it into editable field
      sendToActiveTab({
        name: "paste",
        content: data
      });
    } else {
      // or copy it to clipboard if the click wasn't over an editable field
      sendToActiveTab({
        name: "copy",
        content: data
      });
    }
  }
}
