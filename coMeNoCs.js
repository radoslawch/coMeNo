function checkError(error) {
  if (error) {
    console.error("coMeNoCs: " + error);
  }
}

// message from background script
chrome.runtime.onMessage.addListener(pasteOrCopy);

// message receiver function
function pasteOrCopy(message, sender, sendResponse) {
  if (message.name == "paste") {
    paste(message);

  } else if (message.name == "copy") {
    copy(message);
  }
}

// paste note to current input
function paste(message) {
  let actEl = getActiveElement();
  let selStart = 0;
  let selEnd = 0;
	[selStart, selEnd] = getSelectionStartEnd();
	
  // if making an attempt to paste into normal input field or textarea
  // find current selection and place the note in it
  if (isNormalInputField()) {
    // dealing with normal input field
    // check if it's input type and update value
    // update innerText otherwise
    if (actEl.hasAttribute("value") || actEl.innerText == "") {
			actEl.value = calculateNewFieldValue(actEl.value);
    } else {
			actEl.innerText = calculateNewFieldValue(actEl.innerText);
    }
    actEl.selectionStart = selStart + message.content.length;
    actEl.selectionEnd = selStart + message.content.length;		
  } else if (actEl.contentEditable){
    // dealing with contentEditable field (for ex. editable div)
		let elementToDispatchEventFrom;
		let newEl;
		if (isFacebookInputField()) {
      // dealing with Facebook Messenger field
      // which requires dedicated behaviour
			let dc = getDeepestChild(actEl);
			elementToDispatchEventFrom = dc.parentElement;
			if (dc.nodeName.toLowerCase() == "br") {
				// attempt to paste into empty messenger field
				// by creating new element and setting it's value
				newEl = document.createElement("span");
				newEl.setAttribute("data-text", "true");
				dc.parentElement.appendChild(newEl);
				newEl.innerText = message.content;
			} else {
				// attempt to paste into not empty messenger field
				// by changing existing content
				dc.textContent = calculateNewFieldValue(dc.textContent);
				elementToDispatchEventFrom = elementToDispatchEventFrom.parentElement;
			}			
		} else {
      // dealing with other contentEditable field
      // (for ex. WhatsApp)
			elementToDispatchEventFrom = actEl;
			actEl.textContent = calculateNewFieldValue(actEl.textContent);
		}
		// simulate user's input for contentEditable field
		elementToDispatchEventFrom.dispatchEvent(new InputEvent('input', { bubbles: true }));
		// remove new element if it exists
		// otherwise there will be two of them after
		// Facebook adds it itself
    if (newEl) newEl.remove();
    
    // move cursor to proper position
		moveSelectionByCharacters(selStart + message.content.length);		
	} else {
    // fallback to copying the message to clipboard if pasting wasn't possible
    let messageOverride = "It's impossible to input into non-standard input field, sorry. :-(\n" +
    "Copied your note into the clipboard instead. You can paste it yourself now!"
    copy(message, messageOverride);
  }
  
  // calculate new field value by placing the note in proper position
	function calculateNewFieldValue(fieldVal){
		return fieldVal.slice(0, selStart) + message.content + fieldVal.slice(selEnd);
  }
  
  // get current selection from webpage
  function getSelectionStartEnd(){
    let selStart = 0;
    let selEnd = 0;
    if (isNormalInputField()){
      selStart = actEl.selectionStart;
      selEnd = actEl.selectionEnd;
    } else if (actEl.contentEditable){
      let sel = document.getSelection();
      selStart = sel.anchorOffset;
      selEnd = sel.focusOffset;
    }
    [selStart, selEnd] = orderTwoNumbers(selStart, selEnd);
    return [selStart, selEnd];
  }
  // return true for Facebook Messenger input fields
  function isFacebookInputField(){
    return actEl.contentEditable && document.body.parentElement.id == "facebook";
  }

  // return true for normal input field
  function isNormalInputField(){
    let nodeName = actEl.nodeName.toLowerCase();
    return (nodeName == "input" && /^(?:text|email|number|search|tel|url|password)$/i.test(actEl.type)) || nodeName == "textarea";
  }
}

// returns the deepest element of last child(s)
function getDeepestChild(element) {
  if (element.lastChild) {
    return getDeepestChild(element.lastChild)
  } else {
    return element;
  }
}

// copy the note to the clipboard by
// creating an invisible input field
// writing the note to it and then executing
// the copy command
function copy(message, messageOverride) {
  let originalElement = getActiveElement();
  var coMeNoHiddenInput = window.parent.document.createElement("input");
  coMeNoHiddenInput.setAttribute("type", "collapse");
  coMeNoHiddenInput.setAttribute("id", "coMeNoHiddenInput");
  coMeNoHiddenInput.setAttribute("value", message.content);
  window.parent.document.body.appendChild(coMeNoHiddenInput);
  coMeNoHiddenInput.select();
  window.parent.document.execCommand("copy");
  coMeNoHiddenInput.remove();
  chrome.runtime.sendMessage({
    name: "noteCopied",
    messageOverride: messageOverride || false
  }, checkError);
  if (typeof originalElement.focus == "function") {
    originalElement.focus();
  }
}

// https://stackoverflow.com/a/25420726
/**
* Retrieve active element of document and preserve iframe priority MULTILEVEL!
* @return HTMLElement
**/
var getActiveElement = function (document) {

  document = document || window.document;

  // Check if the active element is in the main web or iframe
  if (document.body === document.activeElement
    || document.activeElement.tagName == 'IFRAME') {
    // Get iframes
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; i++) {
      // Recall
      var focused = getActiveElement(iframes[i].contentWindow.document);
      if (focused !== false) {
        return focused; // The focused
      }
    }
  }

  return document.activeElement;
};

// move selection by number of characters
// compare current offset and the target each time
// to make sure the cursor is right position even when
// pasting special characters
function moveSelectionByCharacters(n){
  let i = 0;
  let sel = document.getSelection();
  while (sel.focusOffset < n && i++ < n){
    sel.modify("move", "right", "character");
    sel = document.getSelection();
  }
}

// change order of two numbers so the lower one is first
function orderTwoNumbers(selStart, selEnd){
	if (selStart > selEnd){
		selStart += selEnd;
		selEnd = selStart - selEnd;
		selStart -= selEnd;
	}
	return [selStart, selEnd];
}
