'use strict';

var _ = require('lodash'),

  // hash

  listenLocationChanges = function () {
    window.addEventListener('hashchange', onHashChange, true);
  },

  onChangeHashCallbacks = [],

  onHashChange = function () {
    var routes = getMatchedRoutes(getLocationHash());
    _.each(onChangeHashCallbacks, function (callback) {
      callback(routes);
    });
  },

  getLocationHash = function () {
    var hash = window.location.hash.replace('#', ''),
      queryPosition = hash.indexOf('?');
    hash = queryPosition >= 0 ? hash.substr(0, queryPosition) : hash;
    return ensureHash(hash);
  },

  ensureHash = function (hash) {
    // remove repeated slash
    return ('/' + hash + '/').replace(/\/+/g, '/');
  },

  // routes

  treeRoutes = [],

  initRoutes = function (routes, parentPath) {
    // parse and store routes into treeRoutes
    parentPath = parentPath || '';
    _.each(routes, function (route) {
      var path = ensureHash(parentPath + '/' + route.path);
      treeRoutes.push({
        path: path,
        name: route.name,
        options: route.options || {}
      });
      initRoutes(route.subRoute, path);
    });
  },

  // get the routes that match the hash

  getMatchedRoutes = function (hash) {
    var matchedRoutes = [],
      lastMatchedPath = '';
    hash = ensureHash(hash);
    _.each(treeRoutes, function (route) {
      var match = getMatchedRoutesRegex(route.path, hash);
      // check if current route matches and is the son of the previous route
      if (match && route.path.indexOf(lastMatchedPath) >= 0) {
        lastMatchedPath = route.path;
        matchedRoutes.push(getMatchedRouteData(route, match));
      }
    });
    checkNotFoundRoute(matchedRoutes);
    return matchedRoutes;
  },

  getMatchedRoutesRegex = function (path, hash) {
    var routeMatcher = new RegExp(path.replace(/:[^\s/]+/g, '([\\w-]+)'));
    return hash.match(routeMatcher);
  },

  getMatchedRouteData = function (route, match) {
    return {
      name: route.name,
      options: route.options,
      values: _.zipObject(getRouteKeys(route.name), _.rest(match))
    };
  },

  checkNotFoundRoute = function (matchedRoutes) {
    var lastMatchedRoute = _.last(matchedRoutes),
      urlExpected = getRouteUrl(lastMatchedRoute.name, lastMatchedRoute.values);
    if (urlExpected !== getLocationHash()) {
      matchedRoutes.push(NOT_FOUND_ROUTE);
    }
  },

  // helpers

  getRouteByName = function (name) {
    return _.find(treeRoutes, { name: name });
  },

  getRouteUrl = function (name, values) {
    var path = getRouteByName(name).path;
    _.each(getRouteKeys(name), function (key) {
      path = path.replace(':' + key, values[key]);
    });
    return path;
  },

  REGEX_PATH_KEYS = new RegExp(/:[a-z]+/g),

  getRouteKeys = function (name) {
    var path = getRouteByName(name).path;
    return _.map(path.match(REGEX_PATH_KEYS), function (key) {
      return key.substr(1);
    });
  },

  isValidRoute = function (name, values) {
    if (getRouteByName(name)) {
      return !_.size(_.difference(getRouteKeys(name), _.keys(values)));
    }
  },

  decodeQuery = function (query) {
    var result = _.reduce(query || {}, function (queryArray, value, key) {
        queryArray.push(key + '=' + value);
        return queryArray;
      }, []);
    return _.isEmpty(result) ? '' : encodeURI('?' + result.join('&'));
  },

  NOT_FOUND_ROUTE = {
    name: 'notFound',
    values: {}
  };

module.exports = {

  addRoutes (routes) {
    initRoutes(routes);
    listenLocationChanges();
    onHashChange();
  },

  onChangeHash (callback) {
    onChangeHashCallbacks.push(callback);
  },

  go (name, values, query) {
    if (isValidRoute(name, values)) {
      window.location.hash = getRouteUrl(name, values) + decodeQuery(query);
    }
  },

  getUrl (name, values) {
    if (isValidRoute(name, values)) {
      return '#' + getRouteUrl(name, values);
    }
  },

  getQueries () {
    var hash = window.location.hash,
      queryPosition = hash.indexOf('?'),
      result = {},
      queries;
    if (queryPosition >= 0) {
      queries = hash.substr(queryPosition + 1).split('&');
      _.each(queries, function (query) {
        var querySplitted = query.split('=');
        result[querySplitted[0]] = decodeURI(querySplitted[1]);
      });
    }
    return result;
  },

  getQuery (key) {
    return _.get(module.exports.getQueries(), key);
  }

};
