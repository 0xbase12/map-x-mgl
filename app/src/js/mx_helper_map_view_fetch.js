var start;

export function fetchViews(opt) {
  var h = mx.helpers;
  var idProject = mx.settings.project;
  var idUser = mx.settings.user.id;
  var language = mx.settings.language || mx.settings.languages[0];
  var token = mx.settings.user.token;
  var idViews = h.getQueryParameterInit(['idViews', 'views']);
  var collections = h.getQueryParameterInit('collections');
  var collectionsSelectOperator = h.getQueryParameterInit(
    'collectionsSelectOperator'
  );
  var roleMax =
    h.getQueryParameterInit(['viewsRoleMax', 'filterViewsByRoleMax'])[0] || '';
  var noViews = h.getQueryParameterInit('noViews')[0] || '';

  var dataEmpty = {
    views: [],
    states: [],
    timing: 0
  };

  opt = opt || {};
  var host = h.getApiUrl('getViewsListByProject');

  if (noViews === true || noViews.toLowerCase() === 'true') {
    dataEmpty.noViews = true;
    return Promise.resolve(dataEmpty);
  }

  var url =
    host +
    '?' +
    h.objToParams({
      idProject: opt.idProject || idProject,
      idUser: opt.idUser || idUser,
      language: language,
      token: opt.token || token,
      idViews: idViews,
      idCollections: opt.collections || collections,
      collectionsSelectOperator:
        opt.collectionsSelectOperator || collectionsSelectOperator,
      roleMax: roleMax
    });

  start = performance.now();

  return h
    .fetchJsonProgress(url, {
      onProgress: opt.onProgress || onProgress,
      onError: opt.onError || onError,
      onComplete: opt.onComplete || onComplete
    })
    .then((data) => {
      data = data || {};
      data.views = data.views || [];
      data.states = data.states || [];
      console.log(`Views n: ${data.views.length}`);
      return data;
    });
}

function onProgress(d) {
  console.log(Math.round((d.loaded / d.total) * 100));
}

function onError(d) {
  console.log(d);
}

function onComplete() {
  console.log(
    `Views fetch + DB: ${Math.round(performance.now() - start)} [ms]`
  );
}
