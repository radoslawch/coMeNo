function checkError(error){
  if(error){
    console.error("coMeNo: " + error);
  }
}


browser.storage.sync.remove('removedNotesArray');


//message to content script
function sendToActiveTab(message){
    chrome.tabs.query({
        windowId : chrome.windows.WINDOW_ID_CURRENT,
        active : true
    }, function(tabs) {     
        for (var i=0; i<tabs.length; ++i) {
                chrome.tabs.sendMessage(tabs[i].id, message,checkError);
            }
        }
    );
}


//message from content script
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if(message.name == "noteCopied"){
            chrome.notifications.create(
                {
                    "type": "basic",
                    "title": "coMeNo",
                    "message": "Note was copied to clipboard."
                }
            )
        }else if (message.name == "refreshCoMeNo"){
            chrome.storage.sync.get("notesArray", populateCoMeNoFromStorage);
        }
    }
);


chrome.storage.sync.get("notesArray", populateCoMeNoFromStorage);

//generates context menu
function populateCoMeNoFromStorage(result){
    chrome.contextMenus.removeAll();
    
    chrome.contextMenus.create({
          id: "saveNote",
          title: "~Save note~",
          contexts: ["link", "selection"]
    });
    
    if(result.notesArray){
        notesArray = result.notesArray;
        populateCoMeNoFromVariable();
        
    }else{
        notesArray = new Array();
    } 
}

//populates context menu with notes
function populateCoMeNoFromVariable(){
    chrome.contextMenus.create({
        id: "separator",
        type: "separator",
        contexts: ["editable", "page"]
    });
    for(var i = 0; i < notesArray.length; i++){
        chrome.contextMenus.create({
          id: notesArray[i].id.toString(),
          title: notesArray[i].content.slice(0,24),
          contexts: ["editable", "page"]
        }); 
    }
}

//updates context menu with a new note
function addNewCoMeNo(){ 
    chrome.contextMenus.create({
        id: notesArray[notesArray.length-1].id.toString(),
        title: notesArray[notesArray.length-1].content.slice(0,24),
        contexts: ["editable", "page"]
    });
}



chrome.contextMenus.onClicked.addListener(onClicked);

function onClicked(info, tab){
    for(var i = 0; i < notesArray.length; i++){
        if(notesArray[i].id == info.menuItemId)break;
    }
    
    if(info.menuItemId == "saveNote"){
        // if user pressed option to save new note
        if(info.selectionText != "" && typeof info.selectionText != "undefined"){
            // saving selection
            content = info.selectionText;
        }else if(info.linkUrl != "" && typeof info.linkUrl != "undefined"){
            // saving url
            content = info.linkUrl;
        }else{
            return;
        }
        
        if(notesArray.length > 0){
            // if any not exist add new with id one higher than last element of 
            // notesArray
            notesArray[notesArray.length] = {
                id: notesArray[notesArray.length-1].id+1,
                content: content
            };
        }else{
            // if there are no notes yet add new with id = 0
            notesArray[notesArray.length] = {
                id: 0,
                content: content
            };           
        }        
        chrome.storage.sync.set({notesArray: notesArray}, addNewCoMeNo); 
    }else if(info.editable){
        // if user pressed existing note
		// paste it into editable field
        sendToActiveTab({
			name: "paste",
			content: notesArray[i].content
		});
    }else{
        // or copy it to clipboard
        sendToActiveTab({
			name: "copy",
			content: notesArray[i].content
		});
    }
};