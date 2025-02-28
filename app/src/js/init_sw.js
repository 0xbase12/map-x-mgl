/**
 * Register and handle service worker events
 * Adapted from https://developers.google.com/web/tools/workbox/guides/advanced-recipes
 * SEE also sw_listen_skip_waiting_install.js in ./webpack folder
 */
var minQuota = 100000000; // 100 MB or 95.4 MiB
var isCompatible =
  'serviceWorker' in navigator &&
  'storage' in navigator &&
  'estimate' in navigator.storage &&
  'caches' in window;

var blockReload = false;
var debug = true;
var hadSW = false;

console.log('INIT SW');

if (isCompatible) {
  hasEnoughStorage().then((test) => {
    if (test === true) {
      log(`SW - Storage seems ok, register service worker.`);
      addListener();
    } else {
      log(`SW - There is not enough storage.`);
      cleanSw()
        .then(clearCache)
        .then(hasEnoughStorage)
        .then((test) => {
          if (test === true) {
            return addListener();
          }
          if (hadSW) {
            restart();
          }
          log(
            `SW - Lack of storage space, don't try to register service worker restart.`
          );
        });
    }
  });
}

function addListener() {
  window.addEventListener('load', handleInitSw);
}

function toMib(b) {
  return (b / Math.pow(Math.pow(2, 10), 2)).toFixed(2) + ' Mib';
}

function hasEnoughStorage() {
  return navigator.storage.estimate().then((estimate) => {
    var percent = (estimate.usage / estimate.quota) * 100;
    var percentString = percent.toFixed(2) + '%';
    log(`SW - User quota: ${toMib(estimate.quota)}`);
    log(`SW - User percent: ${percentString}`);
    log(`SW - MapX usage: ${toMib(estimate.usage)}`);
    log(`SW - MapX min quota: ${toMib(minQuota)}`);

    return estimate.quota > minQuota;
  });
}

function cleanSw() {
  return navigator.serviceWorker.getRegistrations().then((registrations) => {
    log(`SW - Unregister all Service Worker`);
    for (let registration of registrations) {
      hadSW = true;
      registration.unregister();
    }
  });
}

function clearCache() {
  log(`SW - Clear cache`);
  return caches.keys().then((items) => items.forEach((i) => caches.delete(i)));
}

function handleInitSw() {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(handleRegistration);
}

function handleRegistration(registration) {
  /**
   *  if no controller, new service worker will
   *  activate immediatly
   */
  if (!navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    handleControllerChange
  );

  handleNewServiceWorker(registration, () => {
    showRefreshUI(registration);
  });
}

function handleControllerChange() {
  if (blockReload) {
    return;
  }
  blockReload = true;
  restart();
}

function restart() {
  window.location.reload();
}

function handleNewServiceWorker(registration, informUser) {
  if (registration.waiting) {
    /**
     * SW is waiting to activate. Can occur if multiple clients open and
     * one of the clients is refreshed.
     */
    return informUser();
  }

  if (registration.installing) {
    return listenInstalledStateChange();
  } else {
    // We are currently controlled so a new SW may be found...
    // Add a listener in case a new SW is found,
    registration.addEventListener('updatefound', listenInstalledStateChange);
  }

  function listenInstalledStateChange() {
    registration.installing.addEventListener('statechange', (event) => {
      if (event.target.state === 'installed') {
        // A new service worker is available, inform the user
        informUser();
      }
    });
  }
}

/**
 * Display a modal window to inform the user to update
 */
function showRefreshUI(registration) {
  var skipWaiting = !!(
    !mx ||
    !mx.info ||
    !mx.helpers ||
    !mx.helpers.el ||
    !mx.helpers.modal ||
    !mx.helpers.getDictItem
  );

  if (skipWaiting) {
    log('Skip waiting');
    return update();
  }

  log('Ask the user to install');
  buildModal();

  function update(e) {
    if (!registration.waiting) {
      return;
    }
    if (e && e.target && e.target instanceof Element) {
      e.target.removeEventListener('click', update);
      e.target.setAttribute('disabled', true);
    }
    registration.waiting.postMessage('mx_install');
  }

  function buildModal() {
    var h = mx.helpers;
    h.getDictItem([
      'btn_install_update',
      'update_app_title',
      'update_app_msg'
    ]).then((w) => {
      var txtButton = w[0];
      var titleModal = w[1];
      var txtMsg = w[2];

      var btn = h.el('button', txtButton, {
        class: 'btn btn-default'
      });

      var txt = h.el('p', txtMsg);
      var msg = h.el('div', txt, btn);

      btn.addEventListener('click', update);

      h.modal({
        zIndex: 100000,
        title: titleModal,
        id: 'a',
        content: msg
      });
    });
  }
}

function log(msg) {
  if (debug) {
    console.log(msg);
  }
}
