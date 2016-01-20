chrome.commands.onCommand.addListener(function(command) {
  console.log(command);
  if(command === 'activate') {
    chrome.tabs.executeScript({ file: 'content.js'})
  }
});

chrome.runtime.onConnect.addListener(function(port) {
  chrome.tabs.query({}, function(tabs) {
    var nonIncognitoTabs = tabs.filter(function (tab) { return !tab.incognito  });
    port.postMessage({
      type: 'tabs',
      tabs: nonIncognitoTabs
    })
  });

  port.onMessage.addListener(function(msg) {
    if(msg.type === 'selected') {
      chrome.tabs.update(msg.tab.id, { active: true });
      chrome.tabs.get(msg.tab.id, function(tab) {
        console.log(tab)
        chrome.windows.update(tab.windowId, { focused: true });
      });
    }
  });
});
