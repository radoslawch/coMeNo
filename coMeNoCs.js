function checkError(error){
  if(error){
    console.error("coMeNoCs: " + error);
  }
}

//message from bg
chrome.runtime.onMessage.addListener(pasteOrCopy);

function pasteOrCopy(message, sender, sendResponse){
	if(message.name == "paste"){
		//seems to work on standard input elements
		// doesn't work in (for ex.) FB Messenger input field
		actEl = document.activeElement;
		selStart = actEl.selectionStart;
		selStartCopy = selStart;
		selEnd = actEl.selectionEnd;	  
		actEl.value = actEl.value.slice(0,selStart) + message.content + actEl.value.slice(selEnd);	  
		document.activeElement.selectionStart = selStartCopy + message.content.length;
		document.activeElement.selectionEnd = selStartCopy + message.content.length;
        
	}else if(message.name == "copy"){
		var coMeNoHiddenInput = document.createElement("input");
		coMeNoHiddenInput.setAttribute("type", "collapse");
		coMeNoHiddenInput.setAttribute("id", "coMeNoHiddenInput");
		coMeNoHiddenInput.setAttribute("value", message.content);
		document.body.appendChild(coMeNoHiddenInput);
		coMeNoHiddenInput.select();
		document.execCommand("copy");
		coMeNoHiddenInput.remove();
		chrome.runtime.sendMessage({
		   name: "noteCopied"
		},checkError);
	}
}
