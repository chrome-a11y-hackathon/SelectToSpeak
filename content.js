document.addEventListener('keydown', function(e) {
  if (e.ctrlKey)
  chrome.runtime.sendMessage({speakSelection: true});
}, true);

document.addEventListener('mouseover', function(e) {
  chrome.runtime.sendMessage({x:e.x, y:e.y});
}, true);
