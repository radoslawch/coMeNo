function checkError(error) {
  if (error) {
    console.error("coMeNoCs: " + error);
  }
}

//message from bg
chrome.runtime.onMessage.addListener(pasteOrCopy);

function pasteOrCopy(message, sender, sendResponse) {
  if (message.name == "paste") {
    paste(message);

  } else if (message.name == "copy") {
    copy(message);
  }
}

function paste(message) {
  actEl = getActiveElement();
  // Works well on standard input elements.
  // Doesn't work in (for ex.) Facebook Messenger input field.
  // So first check if we are dealing with normal input field.
  var nodeName = actEl.nodeName.toLowerCase();

  // if making an attempt to paste into normal input field or textarea
  // find current selection and place the note in it
  // copy to clipboard otherwise
  if ((nodeName == "input" && /^(?:text|email|number|search|tel|url|password)$/i.test(actEl.type)) || nodeName == "textarea") {
    selStart = actEl.selectionStart;
    selStartCopy = selStart;
    selEnd = actEl.selectionEnd;
    if (actEl.hasAttribute("value") || actEl.innerText == "") {
      intendedValue = actEl.value.slice(0, selStart) + message.content + actEl.value.slice(selEnd);
      actEl.value = intendedValue;
    } else {
      intendedValue = actEl.innerText.slice(0, selStart) + message.content + actEl.innerText.slice(selEnd);
      actEl.innerText = intendedValue;
    }
    actEl.selectionStart = selStartCopy + message.content.length;
    actEl.selectionEnd = selStartCopy + message.content.length;
  } else {
    // workaround for facebook/messenger
    if (document.body.parentElement.id == "facebook") {
      var dc = getDeepestChild(actEl);
      var elementToDispatchEventFrom = dc.parentElement;
      let newEl;
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
        let sel = document.getSelection();
        selStart = sel.anchorOffset;
        selStartCopy = selStart;
        selEnd = sel.focusOffset;

        intendedValue = dc.textContent.slice(0, selStart) + message.content + dc.textContent.slice(selEnd);
        dc.textContent = intendedValue;
        elementToDispatchEventFrom = elementToDispatchEventFrom.parentElement;
      }
      // simulate user's input
      elementToDispatchEventFrom.dispatchEvent(new InputEvent('input', { bubbles: true }));
      // remove new element if it exists
      // otherwise there will be two of them after
      // Facebook adds it itself!
      if (newEl) newEl.remove();
    } else {
      let messageOverride = "It's impossible to input into non-standard input field, sorry. :-(\n" +
        "Copied your note into the clipboard instead. You can paste it yourself now!"
      copy(message, messageOverride);
    }
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
  var coMeNoHiddenInput = document.createElement("input");
  coMeNoHiddenInput.setAttribute("type", "collapse");
  coMeNoHiddenInput.setAttribute("id", "coMeNoHiddenInput");
  coMeNoHiddenInput.setAttribute("value", message.content);
  document.body.appendChild(coMeNoHiddenInput);
  coMeNoHiddenInput.select();
  document.execCommand("copy");
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
  } else {
    return document.activeElement;
  }

  return false;
};