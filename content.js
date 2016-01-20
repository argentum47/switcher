var port = chrome.runtime.connect()
port.onMessage.addListener(function(msg) {
  console.log("content: ", msg);
  if(msg.type === 'tabs' && msg.tabs)
    init(msg.tabs);
});

function stylesheet() {
  return new Promise(function(res, rej) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', chrome.extension.getURL('style.css'));
    xhr.onload = function() {
      var style = document.createElement('style');
      style.textContent = xhr.responseText;
      res(style)
    }
    xhr.onerror = function(err) { rej(err); }
    xhr.send();
  })
}

function init(tabs) {
  var div = document.createElement('div');
  var shadowEl = div.createShadowRoot();
  var selectedTab;

  div.classList.add('container');
  var container = createContainer(tabs);

  var keyActions = {
    'Up': function(e) {
      selectedTab.classList.remove('selected');
      selectedTab = selectedTab.previousElementSibling || container.tabs.lastElementChild;
      setSelected(selectedTab);
      console.log(selectedTab, 'up')
      return true;
    },

    'Down': function() {
      selectedTab.classList.remove('selected');
      selectedTab = selectedTab.nextElementSibling || container.tabs.firstElementChild;
      setSelected(selectedTab);
      console.log(selectedTab, 'down')
      return true;
    },

    'Esc': function() {
      selectedTab = null;
      div.remove();
      return true;
    },

    'Enter': function() {
      var cTab = tabs.filter(function(tab) {
        return +selectedTab.dataset.id == tab.id;
      })[0];

      div.remove();
      port.postMessage({
        type: 'selected',
        tab: cTab
      });

      return true;
    }
  };

  filterList();

  stylesheet().then(function (style) {
    shadowEl.appendChild(style);
    shadowEl.appendChild(container);
    container.input.focus();
  });

  document.addEventListener('click', function(e) {
    if(e.target != div)
      div.remove();
  });

  container.input.onkeydown = function(e) {
    var identifier = e.keyIdentifier;
    if((e.which || e.keyCode) == 27)
      identifier = 'Esc';

    if(keyActions[identifier] && keyActions[identifier](e))
      e.preventDefault();
  }

  container.input.addEventListener('input', throttle(function() {
    filterList(this.value)
  }));

  function filterList(query) {
    console.log("query", query);
    var filtered = tabs;
    if(query) {
      filtered = tabs.map(function(tab) {
        return levinstheiner(query, tab)
      }).sort(function(tab1, tab2) {
        return tab1.score - tab2.score
      })

    }
    if(selectedTab) selectedTab.classList.remove('selected');

    list = createList(filtered, selectedTab);
    list.onclick = function(e) {
      var p = e.target.closest('li.switcher');
      if(p) {
        setSelected(p)
        keyActions.Enter();
      }
    };

    if(container.tabs) container.tabs.remove();
    container.tabs = list;

    selectedTab = container.tabs.firstElementChild;
    selectedTab.classList.add('selected');

    container.appendChild(list);
  }

  document.body.appendChild(div);

  function setSelected(tabEl) {
    container.querySelector('li#'+tabEl.id).classList.add('selected');
    selectedTab.scrollIntoViewIfNeeded(false);
  }
}


function throttle(fn, delay) {
  delay = delay || 500;
  return function() {
    var args = arguments, self = this;
    setTimeout(function() {
      fn.apply(self, args);
    }, delay);
  }
}

function createContainer(tabs) {
  var container = document.createElement('div');
  var input = document.createElement('input');
  input.placeholder = "Type the name of a tab, use arrow keys to navigate, Enter to continue, Esc to exit";
  container.classList.add('switch-container');
  container.input = input;
  container.appendChild(input);

  return container;
}



function levinstheiner(str, tab) {
  var word = tab.title.toLowerCase();

  if(str.length === 0) return word.length;
  if(word.length === 0) return str.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= word.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= str.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= word.length; i++){
    for(j = 1; j <= str.length; j++){
      if(word.charAt(i-1) == str.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  tab.score = matrix[word.length][str.length];
  console.log(word, str, tab.score)
  return tab;
}

function createList(tabList, selectedTab) {
  var ul = document.createElement('ul');
  tabList.forEach(function(tab) {
    var li = document.createElement('li');
    li.id = 'tab-' + tab.id;
    li.dataset.id = tab.id;
    li.classList.add('switcher')

    var favIcon = document.createElement('img');
    favIcon.src = tab.favIconUrl;

    var tabTitle = document.createElement('span');
    tabTitle.textContent = tab.title;

    var tabUrl = document.createElement('a');
    tabUrl.textContent = tab.url

    if(selectedTab && tab.id === selectedTab.id)
      li.classList.add('selected');

    li.appendChild(favIcon);
    li.appendChild(tabTitle);
    li.appendChild(tabUrl);

    ul.appendChild(li);
  });

  return ul;
}
