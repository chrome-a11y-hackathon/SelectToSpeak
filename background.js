'use strict';

/**
 * Select to Speak.
 */
console.log('hi!');
class SelectToSpeak {
  constructor() {
    chrome.tts.speak('select to speak!');

    // Keyboard shortcut(s).
    chrome.runtime.onMessage.addListener(function(request) {
      if (!this.root)
        return;

      // Ctrl key pressed.
      if (request.speakSelection) {
        chrome.tts.speak(this.root.anchorObject.value + this.root.anchorOffset +
                         this.root.anchorObject.role + ' ' +
                         this.root.focusObject.value + this.root.focusOffset +
                         this.root.focusObject.role);
        this.speakSelection(this.root.anchorObject, this.root.focusObject,
                            this.root.anchorOffset, this.root.focusOffset);
        return;
      }

      // Triggers hover events.
      this.root.hitTest(request.x, request.y);
    }.bind(this));

    chrome.tabs.onUpdated.addListener(function() {
      chrome.automation.getTree(function(r) {
        this.root=r;
        r.addEventListener('hover', function(a) {
          var node = a.target;
          chrome.tts.speak(node.value + ' ' + node.role);
        });
      }.bind(this));
    }.bind(this));
  }

  speakSelection(anchor, focus, anchorOffset, focusOffset) {
    if (anchor == focus && anchor.role == 'staticText') {
      chrome.tts.speak(focus.value.substring(anchorOffset, focusOffset));
      return;
    }

    // Multi-node (non-static text) selection.

    // We must make a first pass through all descendant staticText nodes using
    // the two offsets.
    var anchorStaticText = this.staticTextForOffset(anchor, anchorOffset);
    var focusStaticText = this.staticTextForOffset(focus, focusOffset);

    // An additional pass through the most common ancestor's staticText.
    var anchorAncestors = AutomationUtil.getAncestors(anchor);
    var focusAncestors = AutomationUtil.getAncestors(focus);
    var i = 0;
    while (anchorAncestors[i] && anchorAncestors[i] === focusAncestors[i]) {
      i++;
    }
    i--;
    var mostCommon = focusAncestors[i] || anchorAncestors[i];

    if (mostCommon) {
      var lines = mostCommon.findAll({role: 'staticText'});
      if (!anchorStaticText)
        anchorStaticText = lines[0];
      var on = false;
      var lineText = lines.reduce(function(s, w) {
        if (on) {
          if (w === focusStaticText) {
            on = false;
            return s + w.value.substring(focusOffset);
          }
          return s + w.value;
        } else {
          if (w === anchorStaticText) {
            on = true;
            return s + w.value.substring(anchorOffset, w.length);
          }

          return s;
        }
      }, '');

        chrome.tts.speak(lineText);
    }
  }

  staticTextForOffset(node, offset) {
    if (node.role == 'staticText')
      return node;

    var ret = null;
    var allStaticText = node.findAll({role: 'staticText'});
    var text = allStaticText.reduce(function(s, w) {
      if (s.length <= offset)
        ret = w;
      return s + w.value;
    }, '');
    return ret;
  }
}

new SelectToSpeak();
