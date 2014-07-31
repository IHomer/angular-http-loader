/* global angular, console */

angular
  .module('ng.httpLoader', [
    'ng.httpLoader.httpMethodInterceptor'
  ])

  .directive('ngHttpLoader', [
    '$rootScope',
    '$parse',
    function ($rootScope, $parse) {

      /**
       * Usage example:
       *
       * Multiple method loader
       *
       * <div ng-http-loader
       *      methods="['PUT', 'POST']"
       *      template="example/loader.tpl.html"></div>
       *
       * Single method loader
       *
       * <div ng-http-loader
       *      methods="'GET'"
       *      template="example/loader.tpl.html"></div>
       *
       * Adding a title [optional]
       *
       * <div ng-http-loader
       *      title="Foo"
       *      methods="'GET'"
       *      template="example/loader.tpl.html"></div>
       */
      return {
        /**
         * Available attributes
         *
         * @param {array|string} methods
         * @param {string} template
         * @param {string} title
         */
        scope: {
          methods: '@',
          template: '@',
          title: '@'
        },
        template: '<div ng-include="template" ng-show="showLoader"></div>',
        link: function ($scope) {
          var methods = $parse($scope.methods)() || $scope.methods;
          methods = angular.isUndefined(methods) ? [] : methods;
          methods = angular.isArray(methods) ? methods : [methods];
          angular.forEach(methods, function (method, index) {
            methods[index] = method.toUpperCase();
          });

          // add minimal indexOf polyfill
          if (!Array.prototype.indexOf) {
            methods.indexOf = function (value) {
              for (var i = this.length; i--;) {
                if (this[i] === value) {
                  return i;
                }
              }

              return -1;
            };
          }

          /**
           * Loader is hidden by default
           * @type {boolean}
           */
          $scope.showLoader = false;

          /**
           * Toggle the show loader.
           * Contains the logic to show or hide the loader depending
           * on the passed method
           *
           * @param {object} event
           * @param {string} method
           */
          var toggleShowLoader = function (event, method) {
            if (methods.indexOf(method.toUpperCase()) !== -1) {
              $scope.showLoader = (event.name === 'loaderShow');
            } else if (methods.length === 0) {
              $scope.showLoader = (event.name === 'loaderShow');
            }
          };

          $rootScope.$on("loaderShow", toggleShowLoader);
          $rootScope.$on("loaderHide", toggleShowLoader);
        }
      };
    }
  ]);

/* global angular, _, console */

/**
 * Http method interceptor. Broadcast events for show or hide the loader.
 */
angular
  .module('ng.httpLoader.httpMethodInterceptor', [])

  .provider('httpMethodInterceptor', function () {
    var domains = [];

    /**
     * Add domains to the white list
     *
     * @param {string} domain
     * Added Domain to the white list domains collection
     */
    this.whitelistDomain = function (domain) {
      domains.push(domain);
    };

    this.$get = [
      '$q',
      '$rootScope',
      function ($q, $rootScope) {
        var numLoadings = 0;

        /**
         * Check if the url domain is on the whitelist
         *
         * @param {string} url
         *
         * @returns {boolean}
         */
        var isUrlOnWhitelist = function (url) {
          for (var i = domains.length; i--;) {
            if (url.indexOf(domains[i]) !== -1) {
              return true;
            }
          }

          return false;
        };

        /**
         * Emit hide loader logic
         *
         * @param {object} config
         * The response configuration
         */
        var checkAndHide = function (config) {
          if (isUrlOnWhitelist(config.url) &&
            (--numLoadings) === 0) {
            $rootScope.$emit('loaderHide', config.method);
          }
        };

        return {
          /**
           * Broadcast the loader show event
           *
           * @param {object} config
           *
           * @returns {object|Promise}
           */
          request: function (config) {
            if (isUrlOnWhitelist(config.url)) {
              numLoadings++;
              $rootScope.$emit('loaderShow', config.method);
            }

            return config || $q.when(config);
          },

          /**
           * Broadcast the loader hide event
           *
           * @param {object} response
           *
           * @returns {object|Promise}
           */
          response: function (response) {
            checkAndHide(response.config);

            return response || $q.when(response);
          },

          /**
           * Handle errors
           *
           * @param {object} response
           *
           * @returns {Promise}
           */
          responseError: function (response) {
            checkAndHide(response.config);

            return $q.reject(response);
          }
        };
      }
    ];
  })

  .config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('httpMethodInterceptor');
  }]);
