/**
 * TODO: use URL interface everywhere
 */

/**
 * Set url in mx object
 * NOTE: set in init_common.js
 * @param {Object} param Object to use as default. If empty, get current query parameters
 * @param {Object} opt Options
 * @param {Boolean} opt.reset Reset current init params ?
 */
export function setQueryParametersInit(param,opt) {
  opt = Object.assign({},{reset:false},opt);
  param =  param || getQueryParametersAsObject();
  const init = mx.initQueryParams;

  if(opt.reset){
    Object.keys(init).forEach(k=>{
      delete init[k];
    });
  }

  Object.keys(param).forEach((k) => {
    init[k] = asArray(param[k]);
  });
  if(window.Shiny){
    Shiny.onInputChange('urlSearchParam',init);
  }
}
/**
* Reset init parameters
*/
export function setQueryParametersInitReset() {
  setQueryParametersInit(null,{reset:true});
}

export function getQueryParametersInit(){
  return mx.initQueryParams;
}

/**
 * Get stored query parameters
 * @param {String||Array} name/key to retrieve
 * @return {Array}
 */

export function getQueryParameterInit(name) {
  const h = mx.helpers;
  let out = [];
  if (h.isArray(name)) {
    out = name.map((n) => mx.initQueryParams[n]);
  } else {
    out = mx.initQueryParams[name];
  }
  return asArray(out);
}

/**
 * Remove query parameters item based on default set in mx.temporaryParamKeys
 */
export function cleanTemporaryQueryParameters() {
  const params = getQueryParametersAsObject();
  const keysCurrent = Object.keys(params);
  const keysPermanent = mx.settings.paramKeysPermanent || [];

  keysCurrent.forEach((k) => {
    if (keysPermanent.indexOf(k) === -1) {
      delete params[k];
    }
  });
  setQueryParameters(params, {update: false});
}

/**
 * Get url query parameter by name
 *
 * @param {String|Array} name Name of the query parameter name. If name is an array, values will be concatenated in the same array
 * @return {Array} Array of values from the query parameter
 */
export function getQueryParameter(name) {
  var h = mx.helpers;
  if (h.isArray(name)) {
    return getQueryParameter_array(name);
  } else {
    var url = new URL(window.location.href);
    var p = url.searchParams.get(name);
    return asArray(p);
  }
}

function getQueryParameter_array(names) {
  return names
    .map((n) => getQueryParameter(n))
    .reduce((p, a) => a.concat(p), []);
}

/**
 * Get all query parameters as an object
 * @param {String} urlString Url to decode. If empty window.location.href is used
 * @return {Object}
 */
export function getQueryParametersAsObject(urlString) {
  const out = {};
  const url = new URL(urlString || window.location.href);
  url.searchParams.forEach((v, k) => {
    /**
    * Note: check why lowercase was set
    */
    //out[k.toLowerCase()] = asArray(v);
    out[k] = asArray(v);
  });
  return out;
}

function asArray(str) {
  const h = mx.helpers;
  return h.isArray(str) ? str : h.isString(str) ? str.split(',') : [str];
}
function asString(array) {
  const h = mx.helpers;
  return h.isString(array)
    ? array
    : h.isArray(array)
    ? array.join(',')
    : JSON.stringify(array);
}

/**
 * Replace current url state using object values
 * @param {Object} params params
 * @param {Object} opt Options
 * @param {Boolean} opt.update Update current ? if false, reset
 * @return null
 */
export function setQueryParameters(params, opt) {
  opt = opt || {};
  const searchString = opt.update ? window.location.search : '';
  const searchParams = new URLSearchParams(searchString);
  Object.keys(params).forEach((k) => {
    searchParams.set(k, asString(params[k]));
  });
  const state = window.location.pathname + '?' + searchParams.toString();
  history.pushState(null, '', state);
}
/**
 * Update only version.
 * Shiny need a one parameter handler for binding, setQueryParameters takes two.
 */
export function setQueryParametersUpdate(params) {
  return setQueryParameters(params, {update: true});
}

/**
 * Convert object to params string
 *
 * @param {Object} opt Options
 * @param {Object} object to convert
 * @return {String} params string
 */
export function objToParams(data) {
  var esc = encodeURIComponent;
  var params = [];

  Object.keys(data).forEach((k) => {
    if (k) {
      params.push(esc(k) + '=' + esc(data[k]));
    }
  });

  return params.join('&');
}
