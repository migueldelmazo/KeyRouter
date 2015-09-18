'use strict';

var _ = require('lodash');

var

  // hash

  listenLocationChanges = function () {
    window.addEventListener('hashchange', onHashChange, true);
  },

  onHashChange = function () {
    updateAtom(getLocationHash());
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
        name: route.name
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
        matchedRoutes.push(getMatchedRouteData(route.name, match));
      }
    });
    checkNotFoundRoute(matchedRoutes);
    return matchedRoutes;
  },

  getMatchedRoutesRegex = function (path, hash) {
    var routeMatcher = new RegExp(path.replace(/:[^\s/]+/g, '([\\w-]+)'));
    return hash.match(routeMatcher);
  },

  getMatchedRouteData = function (name, match) {
    return {
      name: name,
      values: _.zipObject(getRouteKeys(name), _.rest(match))
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

  NOT_FOUND_ROUTE = {
    name: 'notFound',
    values: {}
  };

module.exports = {

  init (appRoutes) {
    initRoutes(appRoutes);
    listenLocationChanges();
  },

  go (name, values) {
    if (isValidRoute(name, values)) {
      window.location.hash = getRouteUrl(name, values);
    }
  },

  getUrl (name, values) {
    if (isValidRoute(name, values)) {
      return '#' + getRouteUrl(name, values);
    }
  },

  getMatchedRoutes (hash) {
    return getMatchedRoutes(hash);
  }

};

window.route = module.exports;
