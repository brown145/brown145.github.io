
(function(angular, window, document, undefined) {
  'use strict';
/* exported ebApp */

var ebApp = angular.module('ebApp', ['ng', 'ngLocale', 'ngCookies', 'ngAnimate', 'sbTemplates', 'pascalprecht.translate', 'angular-inview']);
;
/* global window:false */
/* global document:false */
/* global ebApp:false */

window.EmpathyBrokerUI = {
  config: function(ebURL, config, rootElement) {
    'use strict';

    ebApp.config(['ebConfigProvider', '$compileProvider', '$translateProvider', function(ebConfigProvider, $compileProvider, $translateProvider) {
      var ebConfig = ebConfigProvider.setConfig(ebURL, config);
      $compileProvider.debugInfoEnabled(false);
      $translateProvider.preferredLanguage(ebConfig.displayLang);
      $translateProvider.fallbackLanguage('en');
    }]);

    if (!angular.isUndefined(rootElement)) {
      var root = angular.element(rootElement);

      ebApp.run(['$templateCache', function($templateCache) {
        root.html($templateCache.get('templates/root.html'));
      }]);

      angular.element(document).ready(function() {
        angular.bootstrap(root, ['ebApp'], {strictDi: true});
      });
    }
  }
};
;
/* global ebApp:false */
ebApp.provider('ebConfig', function() {
  'use strict';

  var DEFAULT_CONFIG = {
    lang: 'en',
    displayLang: 'en',
    scope: 'default',
    defaultCurrency: 'USD',
    currencySymbol: 1,
    pageRows: 20,
    disableTracking: false,
    cookieUserId: '__eb_user_id',
    cookieSessionId: '__eb_session_id',
    defaultImage: 'https://placehold.it/200x200'
  };

  var ebConfig = angular.extend({}, DEFAULT_CONFIG);
  this.setConfig = function(url, config) {
    ebConfig = angular.extend({}, DEFAULT_CONFIG, config, {url: url});
    return ebConfig;
  };

  this.$get = function() {
    return ebConfig;
  };

});
;
/* global ebApp:false */

ebApp.controller('EmpathyBrokerController', ['$scope','$rootScope', '$location', '$log', 'ebSearchService', 'ebLinksService', 'ebTrackService', 'ebConfig', '$timeout','$window', function($scope, $rootScope, $location, $log, ebSearchService, ebLinksService, ebTrackService, ebConfig, $timeout, $window) {
  'use strict';

  $scope.query = '';
  $scope.selectedFilters = [];

  // data from the service
  $scope.totalResults = -1;
  $scope.availableFacets = [];
  $scope.availableFilters = [];
  $scope.spellchecked = null;
  $scope.suggestions = [];
  $scope.results = [];
  $scope.topTrends = [];

  $scope.banners = [];
  $scope.promoteds = [];
  $scope.direct = null;

  $scope.topClicked = [];
  $scope.priceStats = {};

  $scope.newSearch = function() {
    if (!$scope.query) {
      ebSearchService.clear();
      ebLinksService.clear();
      return;
    }

    ebSearchService.newSearch({
      query: $scope.query,
      filters: $scope.selectedFilters
    });

    ebLinksService.newSearch({
      query: $scope.query
    });
  };

  $scope.loadMore = function() {
    ebSearchService.nextPage();
  };

  $scope.$watchCollection(ebSearchService.data, function(data) {
    $log.info('Search data updated:', data);
    $scope.totalResults = data.totalResults;
    $scope.availableFacets = data.availableFacets;
    $scope.spellchecked = data.spellchecked;
    $scope.suggestions = data.suggestions;
    $scope.results = data.results;
    $scope.topTrends = data.topTrends;
    $scope.topClicked = data.topClicked;
    $scope.priceStats = data.priceStats;


    $timeout(function() {
      $scope.$broadcast('orderResults');
      $scope.$broadcast('orderSuggestions');

      if ($scope.isNewSearch) {
        $scope.$broadcast('scrollToTop');
      }
    }, 50);
  });

  $scope.$watchCollection(ebLinksService.data, function(data) {
    $log.info('Links data updated:', data);
    $scope.banners = data.banner;
    $scope.promoteds = data.promoted;
    $scope.direct = data.direct;

    if ($scope.direct !== null && $scope.direct.length > 0) {
      $window.location.href = $scope.direct[0].url;
    }

    $timeout(function() {
      $scope.$broadcast('orderSuggestions');
      $scope.$broadcast('orderPromoteds');
    }, 50);
  });

  $scope.$watch(ebSearchService.isLoading, function(isLoading) {
    $scope.$broadcast('ebLoading', isLoading);
  });

  $scope.$watchCollection('selectedFilters', function(selectedFilters, oldFilters) {
    if (selectedFilters !== oldFilters) {
      $log.debug('filters', selectedFilters, 'from', oldFilters);
      $location.search('filters', selectedFilters);
      if ($scope.query) {
        $scope.newSearch();
      }
    }
  });

  $scope.$watch('query', function(query, oldQuery) {
    if (query !== oldQuery) {
      $log.debug('query', query, 'from', oldQuery);
      $location.search('q', $scope.query || undefined);
      $scope.selectedFilters = []; // Reset filters
      $scope.newSearch();
    }
  });

  $scope.$on('ebResultClicked', function($event, result) {
    $event.stopPropagation();
    ebTrackService.trackClick(result._query, result._page, result.name, result.url);
  });

  $scope.$on('$locationChangeSuccess', function() {
    var search = $location.search();
    $scope.query = search.q || '';
    $scope.selectedFilters = angular.isArray(search.filters) ? search.filters : angular.isString(search.filters) ? [search.filters] : [];
  });

  angular.element($window).off('orientationchange resize').on('orientationchange resize', function() {
    $scope.$broadcast('orderResults');
    $scope.$broadcast('orderSuggestions');
    $scope.$broadcast('orderPromoteds');
  });

}]);
;
/* global ebApp:false */

ebApp.directive('ebBannerItem', ['ebConfig', function(ebConfig) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', ebConfig.defaultImage);
  };

  return {
    restrict: 'E',
    scope: {
      banner: '='
    },
    link: function($scope, $element) {
      $element.find('img').one('error', errorHandler);

    },
    templateUrl: 'templates/bannerItem.html'
  };
}]);
;
/* global ebApp:false */
ebApp.directive('ebBanners', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      banners: '='
    },
    templateUrl: 'templates/banners.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebCategoryFacets', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      facet: '='
    },
    templateUrl: 'templates/categoryFacet.html',
    controller: ['$scope', function($scope) {
      $scope.addFilter = function(filter) {
        $scope.$parent.addFilter(filter);
      };
      $scope.addDelFilter = function(item, categoryFacet) {
        $scope.$parent.addDelFilter(item, categoryFacet);
      };
      $scope.removeFilter = function(filter) {
        $scope.$parent.removeFilter(filter);
      };
    }]
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebFacet', [function() {
  'use strict';
  return {
    restrict: 'E',
    scope: {
      facet: '=',
      selectedFilters: '='
    },
    controller: ['$scope', function($scope) {
      $scope.addFilter = function(filter) {
        $scope.$parent.addFilter(filter);
      };
      $scope.addDelFilter = function(item, categoryFacet) {
        $scope.$parent.addDelFilter(item, categoryFacet);
      };
      $scope.removeFilter = function(filter) {
        $scope.$parent.removeFilter(filter);
      };
      $scope.standard_facet = function(filter) {
        return !$scope.order_facet(filter);
      };
      $scope.order_facet = function(filter) {
        return (filter.filter.indexOf('sort:') === 0);
      };
      $scope.range_facet = function(filter) {
        return (filter.indexOf('_range') !== -1);
      };
    }],
    templateUrl: 'templates/facet.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebFacets', [function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/facets.html',
    scope: {
      availableFacets: '=',
      selectedFilters: '='
    },
    controller: ['$scope', function($scope) {
      $scope.showFacets = function() {
        angular.element('#eb-facets').toggle();
      };

      $scope.addDelFilter = function(item, categoryFacet) {
        var filter = item.filter.substring(item.filter.indexOf('}') + 1);
        var facet = filter.substring(0, filter.indexOf(':'));
        $scope.removeFilterByFacet(facet);

        if (categoryFacet) {
          if (item.selected) {
            var ancestor = item.filter.substring(0, item.filter.lastIndexOf('/'));
            if (ancestor !== '') {
              $scope.addFilter(ancestor);
            }
          } else {
            $scope.addFilter(item.filter);
          }
        } else {
          if (item.selected) {
            $scope.removeFilter(item.filter);
          } else {
            $scope.addFilter(item.filter);
          }
        }
      };

      $scope.removeFilterByFacet = function(facet) {
        angular.forEach($scope.selectedFilters, function(filter, index) {
          if (filter.indexOf(facet) !== -1) {
            $scope.selectedFilters.splice(index, 1);
          }
        });
      };

      $scope.filterValue = function(filter) {
        var facet = filter.substring(0, filter.lastIndexOf(':'));
        var value = filter.substring(filter.lastIndexOf(':') + 1);

        if (facet.indexOf('RANGE_price') !== -1) {
          value = value.replace('[', '').replace(']', '').replace(' TO ', ' - ');
        }

        return value;
      };

      $scope.showFacet = function($event, value) {
        var $headerFacet = angular.element($event.currentTarget);

        if ($headerFacet.hasClass('closed')) {

          angular.element('.eb-facets-all .eb-header-facet').removeClass('opened').addClass('closed');
          angular.element('.eb-facets-all .eb-facet').hide();

          $headerFacet.removeClass('closed').addClass('opened');
          angular.element('#eb-facet-' + value).show();
        } else {
          $headerFacet.removeClass('opened').addClass('closed');
          angular.element('#eb-facet-' + value).hide();
        }
      };

      $scope.addFilter = function(filter) {
        if ($scope.selectedFilters.indexOf(filter) === -1) {
          $scope.selectedFilters.push(filter);
        }
      };

      $scope.removeFilter = function(filter) {
        var idx = $scope.selectedFilters.indexOf(filter);
        if (idx > -1) {
          $scope.selectedFilters.splice(idx, 1);
        }
      };
    }]
  };
}]);
;
/* global ebApp:false */

ebApp.directive('infiniteScroll', ['ebMotionService', function(ebMotionService) {
  'use strict';

  return function($scope, $element) {

    var raw = $element[0];

    $element.bind('scroll', function() {
      var offset = ebMotionService.getArticleDimensions().height * 1.5;
      if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight - offset) {
        if (!$scope.isLoading) {
          $scope.loadMore();
        }
      }
    });
  };
}]);
;
/* global ebApp:false */
ebApp.directive('ebNoResults', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      query: '='
    },
    templateUrl: 'templates/noResults.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebPriceFacet', [function() {
  'use strict';
  return {
    restrict: 'E',
    scope: {
      priceStats: '='
    },
    controller: ['$scope', '$timeout', function($scope, $timeout) {
      $scope.cleanPrice = function() {
        $scope.$parent.removeFilterByFacet('priceRange');
      };
      $scope.search_price_min = undefined;
      $scope.search_price_max = undefined;
      $scope.$watch('priceStats', function() {
        $scope.initSlider();
      });
      $scope.initSlider = function() {
        if (($scope.search_price_min || $scope.search_price_max) === undefined) {
          $scope.price_min_range = $scope.price_min = $scope.priceStats.min;
          $scope.price_max_range = $scope.price_max = $scope.priceStats.max;
        } else {
          $scope.price_min = Math.max($scope.search_price_min || 0, $scope.priceStats.min);
          $scope.price_max = Math.min($scope.search_price_max || 10e6, $scope.priceStats.max);
          $scope.price_min_range = $scope.priceStats.min;
          $scope.price_max_range = $scope.priceStats.max;
        }
        $scope.timerMin = undefined;
        $scope.timerMax = undefined;
        $scope.$watch('price_min', function() {
          $timeout.cancel($scope.timerMin);
          $timeout.cancel($scope.timerMax);
          $scope.timerMin = $timeout(function() {
            if ($scope.price_min !== $scope.search_price_min) {
              $scope.search_price_min = $scope.price_min;
              $scope.search_price_max = $scope.price_max;
              $scope.$parent.addPriceFilter($scope.search_price_min, $scope.search_price_max);
            }
          }, 500);
        });
        $scope.$watch('price_max', function() {
          $timeout.cancel($scope.timerMin);
          $timeout.cancel($scope.timerMax);
          $scope.timerMax = $timeout(function() {
            if ($scope.price_max !== $scope.search_price_max) {
              $scope.search_price_min = $scope.price_min;
              $scope.search_price_max = $scope.price_max;
              $scope.$parent.addPriceFilter($scope.search_price_min, $scope.search_price_max);
            }
          }, 500);
        });
      };
    }],
    templateUrl: 'templates/priceFacet.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebPromotedItem', ['ebConfig', 'ebMotionService', function(ebConfig, ebMotionService) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', ebConfig.defaultImage);
  };

  return {
    restrict: 'E',
    scope: {
      promoted: '='
    },
    link: function($scope, $element) {
      $element.find('img').one('error', errorHandler);

      $element.css({transform: ebMotionService.getTranslate('#eb-promoteds', $scope.position) });
      $element.css({opacity: 1 });
    },
    templateUrl: 'templates/promotedItem.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebPromoteds', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      promoteds: '='
    },
    templateUrl: 'templates/promoteds.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebResult', ['$log', 'ebConfig', 'ebMotionService', function($log, ebConfig, ebMotionService) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', ebConfig.defaultImage);
  };

  return {
    restrict: 'E',
    templateUrl: 'templates/result.html',
    scope: {
      result: '=ebResult',
      position: '=ebPosition'
    },
    controller: ['$scope', function($scope) {
      $scope.resultClicked = function($event) {
        $event.preventDefault();
        $scope.$emit('ebResultClicked', $scope.result);
      };
    }],
    link: function($scope, $element) {
      $element.find('img').one('error', errorHandler);
      $element.css({transform: ebMotionService.getTranslate('#eb-articles', $scope.position)});
      $element.css({opacity: 1 });
    }
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebResults', ['ebMotionService', function(ebMotionService) {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/results.html',
    scope: {
      results: '=',
      totalResults: '=',
      suggestions: '=',
      spellchecked: '=',
      loadMore: '&',
      availableFacets: '=',
      selectedFilters: '=',
      topTrends: '=',
      banners: '=',
      promoteds: '=',
      priceStats: '=',
      query: '='
    },
    controller: ['$scope', function($scope) {
      $scope.isLoading = false;

      $scope.$on('ebLoading', function($event, loading) {
        $scope.isLoading = loading;
      });

      $scope.showBanners = function() {
        return ($scope.banners.length > 0);
      };

      $scope.showPromoteds = function() {
        return ($scope.promoteds.length > 0);
      };

      $scope.showSuggestions = function() {
        return !$scope.showBanners() &&
            !$scope.showPromoteds() &&
            ($scope.suggestions.length > 0);
      };

      $scope.showSpellcheck = function() {
        return ($scope.spellchecked !== null);
      };

      $scope.showResults = function() {
        return ($scope.results.length > 0);
      };

      $scope.showNoResults = function() {
        return !$scope.showBanners() &&
            !$scope.showPromoteds() &&
            !$scope.showResults() &&
            ($scope.totalResults === 0) &&
            ($scope.suggestions.length === 0);
      };

      $scope.$on('scrollToTop', function() {
        angular.element('#eb-results').scrollTop(0);
      });

      $scope.$on('orderResults', function() {
        var $allDocs = angular.element('#eb-articles').find('.eb-article');

        for (var j = 0; j < $allDocs.length; j++) {
          var $doc = angular.element($allDocs[j]);
          $doc.css({transform: ebMotionService.getTranslate('#eb-articles', $doc.attr('position')) });
        }

        angular.element('#eb-articles').css({height: ebMotionService.getListHeight('#eb-articles', $allDocs.length)});
      });

      $scope.$on('orderSuggestions', function() {
        var $suggestionsLists = angular.element('.eb-suggestion-list');
        for (var i = 0; i < $suggestionsLists.length; i++) {
          var $suggestionList = angular.element($suggestionsLists[i]);
          var $suggestions = $suggestionList.find('.eb-article');

          $suggestionList.css({height: ebMotionService.getListHeight('#eb-suggestions', $suggestions.length)});

          for (var j = 0; j < $suggestions.length; j++) {
            var $suggestion = angular.element($suggestions[j]);
            $suggestion.css({transform: ebMotionService.getTranslate('#eb-suggestions', j) });
          }
        }
      });
    }]
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebScrollButtom', [function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/scrollButtom.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebSearchbox', ['$translate', '$interval', 'ebConfig', function($translate, $interval, ebConfig) {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/searchbox.html',
    scope: {
      query: '='
    },
    controller: ['$scope', function($scope) {
      $scope.isLoading = false;
      $scope.inputPlaceholder = '';
      $scope.inputOptions = {
        updateOn: 'default search',
        debounce: {
          default: ebConfig.inputDebounce || 500,
          search: 0
        }
      };

      // TODO: hacerlo con CSS
      $translate('SEARCHBOX_PLACEHOLDER').then(function(placeholderText) {
        $interval(function() {
          $scope.inputPlaceholder = placeholderText.substring(0, $scope.inputPlaceholder.length + 1);
        }, 100, placeholderText.length);
      });

      $scope.$on('ebLoading', function($event, loading) {
        $scope.isLoading = loading;
      });
    }]
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebSpellcheck', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      spellchecked: '=',
      query: '='
    },
    templateUrl: 'templates/spellcheck.html'
  };
}]);
;
/* global ebApp:false */

ebApp.directive('ebSuggestions', [function() {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      suggestions: '=',
      query: '='
    },
    controller: ['$scope', function($scope) {
      $scope.getDivSuggestionId = function(id) {
        return id.split(' ').join('-');
      };

      $scope.getTitle = function(item) {
        return item.name_raw ? item.name_raw : item.name;
      };

      $scope.suggestionClicked = function($event, suggestion) {
        $event.preventDefault();
        $scope.$emit('ebSuggestionClicked', suggestion);
      };
    }],
    templateUrl: 'templates/suggestions.html'
  };
}]);
;
/* global ebApp:false */

ebApp.filter('ebCurrency', ['$filter', 'ebConfig', function($filter, ebConfig) {
  'use strict';

  var CURRENCY_SYMBOLS = {
    AED: [2, 'dh', '\u062f.\u0625.'],
    ALL: [0, 'Lek', 'Lek'],
    AUD: [2, '$', 'AU$'],
    BDT: [2, '\u09F3', 'Tk'],
    BGN: [2, 'lev', 'lev'],
    BRL: [2, 'R$', 'R$'],
    CAD: [2, '$', 'C$'],
    CDF: [2, 'FrCD', 'CDF'],
    CHF: [2, 'CHF', 'CHF'],
    CLP: [0, '$', 'CL$'],
    CNY: [2, '¥', 'RMB¥'],
    COP: [0, '$', 'COL$'],
    CRC: [0, '\u20a1', 'CR\u20a1'],
    CZK: [50, 'K\u010d', 'K\u010d'],
    DKK: [18, 'kr', 'kr'],
    DOP: [2, '$', 'RD$'],
    EGP: [2, '£', 'LE'],
    ETB: [2, 'Birr', 'Birr'],
    EUR: [2, '€', '€'],
    GBP: [2, '£', 'GB£'],
    HKD: [2, '$', 'HK$'],
    HRK: [2, 'kn', 'kn'],
    HUF: [0, 'Ft', 'Ft'],
    IDR: [0, 'Rp', 'Rp'],
    ILS: [2, '\u20AA', 'IL\u20AA'],
    INR: [2, '\u20B9', 'Rs'],
    IRR: [0, 'Rial', 'IRR'],
    ISK: [0, 'kr', 'kr'],
    JMD: [2, '$', 'JA$'],
    JPY: [0, '¥', 'JP¥'],
    KRW: [0, '\u20A9', 'KR₩'],
    LKR: [2, 'Rs', 'SLRs'],
    LTL: [2, 'Lt', 'Lt'],
    MNT: [0, '\u20AE', 'MN₮'],
    MVR: [2, 'Rf', 'MVR'],
    MXN: [2, '$', 'Mex$'],
    MYR: [2, 'RM', 'RM'],
    NOK: [50, 'kr', 'NOkr'],
    PAB: [2, 'B/.', 'B/.'],
    PEN: [2, 'S/.', 'S/.'],
    PHP: [2, '\u20B1', 'Php'],
    PKR: [0, 'Rs', 'PKRs.'],
    PLN: [50, 'z\u0142', 'z\u0142'],
    RON: [2, 'RON', 'RON'],
    RSD: [0, 'din', 'RSD'],
    RUB: [50, 'руб.', 'руб.'],
    SAR: [2, 'Rial', 'Rial'],
    SEK: [2, 'kr', 'kr'],
    SGD: [2, '$', 'S$'],
    THB: [2, '\u0e3f', 'THB'],
    TRY: [2, 'TL', 'YTL'],
    TWD: [2, 'NT$', 'NT$'],
    TZS: [0, 'TSh', 'TSh'],
    UAH: [2, '\u20B4', 'UAH'],
    USD: [2, '$', 'US$'],
    UYU: [2, '$', '$U'],
    VND: [0, '\u20AB', 'VN\u20AB'],
    YER: [0, 'Rial', 'Rial'],
    ZAR: [2, 'R', 'ZAR']

    // Tier 2
    /*
    AFN: [48, 'Af.', 'AFN'],
    AMD: [0, 'Dram', 'dram'],
    ANG: [2, 'NAf.', 'ANG'],
    AOA: [2, 'Kz', 'Kz'],
    ARS: [2, '$', 'AR$'],
    AWG: [2, 'Afl.', 'Afl.'],
    AZN: [2, 'man.', 'man.'],
    BAM: [2, 'KM', 'KM'],
    BBD: [2, '$', 'Bds$'],
    BHD: [3, 'din', 'din'],
    BIF: [0, 'FBu', 'FBu'],
    BMD: [2, '$', 'BD$'],
    BND: [2, '$', 'B$'],
    BOB: [2, 'Bs', 'Bs'],
    BSD: [2, '$', 'BS$'],
    BTN: [2, 'Nu.', 'Nu.'],
    BWP: [2, 'P', 'pula'],
    BYR: [0, 'BYR', 'BYR'],
    BZD: [2, '$', 'BZ$'],
    CUC: [1, '$', 'CUC$'],
    CUP: [2, '$', 'CU$'],
    CVE: [2, 'CVE', 'Esc'],
    DJF: [0, 'Fdj', 'Fdj'],
    DZD: [2, 'din', 'din'],
    ERN: [2, 'Nfk', 'Nfk'],
    FJD: [2, '$', 'FJ$'],
    FKP: [2, '£', 'FK£'],
    GEL: [2, 'GEL', 'GEL'],
    GHS: [2, 'GHS', 'GHS'],
    GIP: [2, '£', 'GI£'],
    GMD: [2, 'GMD', 'GMD'],
    GNF: [0, 'FG', 'FG'],
    GTQ: [2, 'Q', 'GTQ'],
    GYD: [0, '$', 'GY$'],
    HNL: [2, 'L', 'HNL'],
    HTG: [2, 'HTG', 'HTG'],
    IQD: [0, 'din', 'IQD'],
    JOD: [3, 'din', 'JOD'],
    KES: [2, 'Ksh', 'Ksh'],
    KGS: [2, 'KGS', 'KGS'],
    KHR: [2, 'Riel', 'KHR'],
    KMF: [0, 'CF', 'KMF'],
    KPW: [0, '\u20A9KP', 'KPW'],
    KWD: [3, 'din', 'KWD'],
    KYD: [2, '$', 'KY$'],
    KZT: [2, '\u20B8', 'KZT'],
    LAK: [0, '\u20AD', '\u20AD'],
    LBP: [0, 'L£', 'LBP'],
    LRD: [2, '$', 'L$'],
    LSL: [2, 'LSL', 'LSL'],
    LYD: [3, 'din', 'LD'],
    MAD: [2, 'dh', 'MAD'],
    MDL: [2, 'MDL', 'MDL'],
    MGA: [0, 'Ar', 'MGA'],
    MKD: [2, 'din', 'MKD'],
    MMK: [0, 'K', 'MMK'],
    MOP: [2, 'MOP', 'MOP$'],
    MRO: [0, 'MRO', 'MRO'],
    MUR: [0, 'MURs', 'MURs'],
    MWK: [2, 'MWK', 'MWK'],
    MZN: [2, 'MTn', 'MTn'],
    NAD: [2, '$', 'N$'],
    NGN: [2, '\u20A6', 'NG\u20A6'],
    NIO: [2, 'C$', 'C$'],
    NPR: [2, 'Rs', 'NPRs'],
    NZD: [2, '$', 'NZ$'],
    OMR: [3, 'Rial', 'OMR'],
    PGK: [2, 'PGK', 'PGK'],
    PYG: [0, 'Gs', 'PYG'],
    QAR: [2, 'Rial', 'QR'],
    RWF: [0, 'RF', 'RF'],
    SBD: [2, '$', 'SI$'],
    SCR: [2, 'SCR', 'SCR'],
    SDG: [2, 'SDG', 'SDG'],
    SHP: [2, '£', 'SH£'],
    SLL: [0, 'SLL', 'SLL'],
    SOS: [0, 'SOS', 'SOS'],
    SRD: [2, '$', 'SR$'],
    SSP: [2, '£', 'SSP'],
    STD: [0, 'Db', 'Db'],
    SYP: [0, '£', 'SY£'],
    SZL: [2, 'SZL', 'SZL'],
    TJS: [2, 'Som', 'TJS'],
    TND: [3, 'din', 'DT'],
    TOP: [2, 'T$', 'T$'],
    TTD: [2, '$', 'TT$'],
    UGX: [0, 'UGX', 'UGX'],
    UZS: [0, 'so\u02bcm', 'UZS'],
    VEF: [2, 'Bs', 'Bs'],
    VUV: [0, 'VUV', 'VUV'],
    WST: [2, 'WST', 'WST'],
    XAF: [0, 'FCFA', 'FCFA'],
    XCD: [2, '$', 'EC$'],
    XOF: [0, 'CFA', 'CFA'],
    XPF: [0, 'FCFP', 'FCFP'],
    ZMW: [0, 'ZMW', 'ZMW'],
    ZWD: [0, '$', 'Z$']
    */
  };

  return function(input, inputCurrency) {
    /* jslint bitwise:true */
    var info = CURRENCY_SYMBOLS[inputCurrency] || CURRENCY_SYMBOLS[ebConfig.defaultCurrency] || CURRENCY_SYMBOLS.EUR;
    var value = $filter('number')(parseFloat(input), info[0] & 0x07);
    var space = (info[0] & 0x20) === 0 ? '' : ' ';
    var prefix = (info[0] & 0x10) === 0;
    var symbol = info[ebConfig.currencySymbol || 1];

    return prefix ? symbol + space + value : value + space + symbol;
  };

}]);
;
/* global ebApp:false */

ebApp.config(['$translateProvider', function($translateProvider) {
  'use strict';

  $translateProvider.translations('en', {
    SEARCHBOX_PLACEHOLDER: 'What are you loking for?',
    SPELLCHECKED: 'Results for "{{spellchecked}}"',
    RESULTS_FOUND: 'Found {{results}} results',
    RESULTS_NORESULTS: 'Sorry, we could not find results for "{{query}}"',
    RESULTS_SUGGESTION: 'We found {{results}} for {{suggestion}}:',
    RESULTS_SPELLCHECKED: 'No results found for search <span class="eb-spellcheck-bold">{{query}}</span> but we found results for search <span class="eb-spellcheck-bold">{{spellchecked}}</span>',
    LOADING: 'Loading...',
    FACETS_AVAILABLE: 'Available facets:',
    FACETS_SELECTED: 'Selected facets:',
    FACETS_SHOW_MORE: '+ show more',
    FACETS_SHOW_LESS: '- show less',
    RESULTS_WE_RECOMMEND: 'We recommend',
    CLOSE: 'Close',
    FACETS_REFINE_BY: 'Refine by :',
    FACET_TITLE: {
      COLOUR_FACET: 'Colour',
      CATEGORY_0_FACET: 'Category'
    },
    TRY_AGAIN: 'Try again!',
    MAKE_SURE: 'Make sure the text is correctly written  or try less specific search terms.',
    SHOW_MORE: 'show more'
  });

}]);
;
/* global ebApp:false */

ebApp.config(['$translateProvider', function($translateProvider) {
  'use strict';

  $translateProvider.translations('es', {
    SEARCHBOX_PLACEHOLDER: 'Qué estás buscando?',
    SPELLCHECKED: 'Resultados para "{{spellchecked}}"',
    RESULTS_FOUND: 'Encontrados {{results}} resultados',
    RESULTS_NORESULTS: 'Lo siento, no hemos encontrado ningun resultado para "{{query}}"',
    RESULTS_SUGGESTION: 'Hemos encontrado {{results}} resultados para {{suggestion}}:',
    LOADING: 'Cargando...',
    FACETS_AVAILABLE: 'Filtros disponibles:',
    FACETS_SELECTED: 'Filtros seleccionados:',
    FACETS_SHOW_MORE: '+ ver más',
    FACETS_SHOW_LESS: '- ver menos',
    CLOSE: 'Cerrar',
    RESULTS_WE_RECOMMEND: 'Nosotros recomendamos: ',
    FACETS_REFINE_BY: 'Refinar por :',
    FACET_TITLE: {
      COLOUR_FACET: 'Color',
      CATEGORY_0_FACET: 'Categoria'
    },
    TRY_AGAIN: 'Try again!',
    MAKE_SURE: 'Make sure the text is correctly written  or try less specific search terms.',
    SHOW_MORE: 'show more'
  });

}]);
;
/* global ebApp:false */

ebApp.factory('ebLinksService', ['$http', '$q', '$log', 'ebTrackService', 'ebConfig', function($http, $q, $log, ebTrackService, ebConfig) {
  'use strict';

  var banner, promoted, direct;

  var clear = function() {
    banner = [];
    promoted = [];
    direct = null;
  };

  clear();

  var lastRequest = null;
  var doSearch = function(searchParams) {

    if (lastRequest !== null && lastRequest.isLoading()) {
      $log.debug('[LINKS]', 'Cancelling running search request');
      lastRequest.cancel();
    }

    var params = {
      q: searchParams.query,
      scope: ebConfig.scope,
      lang: ebConfig.lang
    };

    $log.info('[LINKS]', params);

    var loading = true;
    var canceller = $q.defer();
    var jsonpRequest = $http.jsonp(ebConfig.url + '/services/links', {
      responseType: 'json',
      timeout: canceller.promise,
      params: angular.merge({}, params, {jsonCallback: 'JSON_CALLBACK'})
    });

    jsonpRequest.success(function(data) {
      if (!angular.isObject(data)) {
        return;
      }

      $log.info('[NEW LINKS]');
      clear();

      banner = angular.element.map(data.banner || [], function(item) {
        return {name: item.title_raw, url: item.trackable_url, id: item.id, image: item.imagename, keywords: item.subtitle};
      });

      promoted = angular.element.map(data.promoted || [], function(item) {
        return {name: item.title_raw, url: item.trackable_url, id: item.id, image: item.imagename, keywords: item.subtitle};
      });

      direct = angular.element.map(data.direct || [], function(item) {
        return {url: item.trackable_url};
      });

    });

    jsonpRequest.error(function(data, status) {
      $log.error('error', status, data);
    });

    jsonpRequest.finally(function() {
      loading = false;
    });

    lastRequest = {
      isLoading: function() { return loading; },
      cancel: function() { canceller.resolve(); }
    };

    return jsonpRequest;
  };

  var newSearch = function(searchParams) {
    if (!angular.isObject(searchParams) || !searchParams.query) {
      throw new Error('Missing query parameter to newSearch()');
    }

    doSearch(searchParams);
  };

  return {
    data: function() {
      return {
        banner: banner,
        promoted: promoted,
        direct: direct
      };
    },
    isLoading: function() {
      return lastRequest !== null && lastRequest.isLoading();
    },
    newSearch: newSearch,
    clear: clear
  };
}]);
;
/* global ebApp:false */

ebApp.factory('ebMotionService', ['ebConfig', function(ebConfig) {
  'use strict';

  var getArticleDimensions = function() {
    var articleWidth = angular.element('.eb-result').first().outerWidth(true);
    var articleHeight = angular.element('.eb-result').first().outerHeight(true);

    return { height: articleHeight, width: articleWidth };
  };

  var getArticlesPerRow = function(containerWidth, articleWidth) {
    var articlesPerRow = Math.floor(containerWidth / articleWidth);

    return Math.min(articlesPerRow, ebConfig.maxArticlesPerRow || articlesPerRow);
  };

  var transform = function(container, position) {
    var dimensions = getArticleDimensions();
    var containerWidth = angular.element(container).width();
    var articlesPerRow = getArticlesPerRow(containerWidth, dimensions.width);
    var marginLeft = (containerWidth - (articlesPerRow * dimensions.width)) / 2;
    var row = Math.floor(position / articlesPerRow);
    var col = position % articlesPerRow;
    var dx = ((col * dimensions.width) + marginLeft) + 'px';
    var dy = (row * dimensions.height) + 'px';

    return 'translate3d(' + dx + ',' + dy + ',0px) scale3d(1,1,1)';
  };

  var listHeight = function(container, num_articles) {
    var dimensions = getArticleDimensions();
    var containerWidth = angular.element(container).width();
    var articlesPerRow = getArticlesPerRow(containerWidth, dimensions.width);
    var totalRows = Math.ceil(num_articles / articlesPerRow);
    var height = (totalRows * dimensions.height) + 'px';
    return height;
  };

  return {
    getArticleDimensions: getArticleDimensions,
    getArticlesPerRow: getArticlesPerRow,
    getTranslate: transform,
    getListHeight: listHeight
  };
}]);
;
/* global ebApp:false */

ebApp.factory('ebPingService', ['$http', '$q', '$cookies', '$log', 'ebConfig', function($http, $q, $cookies, $log, ebConfig) {
  'use strict';

  var userId = $cookies.get(ebConfig.cookieUserId) || null;
  var sessionId = $cookies.get(ebConfig.cookieSessionId) || null;

  var userInfoDeferred = $q.defer();
  if (userId !== null && sessionId !== null) {
    userInfoDeferred.resolve({userId: userId, sessionId: sessionId});
  }

  var pingDeferred = $q(function(resolve/*, reject*/) {
    $http.jsonp(ebConfig.url + '/services/ping', {
      responseType: 'json',
      params: {
        jsonCallback: 'JSON_CALLBACK',
        createUser: userId === null,
        createSession: sessionId === null
      }
    }).success(function(data) {
      if (data.userId) {
        var expires = new Date(Date.now() + 365 * 24 * 60 * 60);
        $cookies.put(ebConfig.cookieUserId, data.userId, {expires: expires});
        userId = data.userId;
      }
      if (data.sessionId) {
        $cookies.put(ebConfig.cookieSessionId, data.sessionId);
        sessionId = data.sessionId;
      }

      userInfoDeferred.resolve({userId: userId, sessionId: sessionId});
      resolve(true);
    }).error(function() {
      userInfoDeferred.reject();
      resolve(false);
    });
  });

  return {
    serviceAvailable: pingDeferred,
    getUserInfo: userInfoDeferred.promise
  };
}]);
;
/* global ebApp:false */

ebApp.factory('ebSearchService', ['$http', '$q', '$log', 'ebTrackService', 'ebConfig', function($http, $q, $log, ebTrackService, ebConfig) {
  'use strict';

  var results, totalResults, spellchecked, suggestions, availableFacets, availableFilters, pagesLoaded, currentQuery, currentFacets, currentFilters;

  var clear = function() {
    results = [];
    totalResults = -1;
    spellchecked = null;
    suggestions = [];
    availableFacets = [];
    availableFilters = [];
    pagesLoaded = 0;

    currentQuery = null;
    currentFacets = [];
    currentFilters = [];
  };

  clear();

  var lastRequest = null;
  var doSearch = function(searchParams, isNewSearch) {
    if (isNewSearch && lastRequest !== null && lastRequest.isLoading()) {
      $log.debug('[SEARCH]', 'Cancelling running search request');
      lastRequest.cancel();
    }

    var params = {
      q: isNewSearch ? searchParams.query : currentQuery,
      facet: isNewSearch ? searchParams.facets || [] : currentFacets,
      filter: isNewSearch ? searchParams.filters || [] : currentFilters,
      start: isNewSearch ? 0 : results.length,
      rows: ebConfig.pageRows,
      lang: ebConfig.lang
    };

    $log.info('[SEARCH]', params);

    var loading = true;
    var canceller = $q.defer();
    var jsonpRequest = $http.jsonp(ebConfig.url + '/services/search', {
      responseType: 'json',
      timeout: canceller.promise,
      params: angular.merge({}, params, {jsonCallback: 'JSON_CALLBACK'})
    });

    jsonpRequest.success(function(data) {
      if (!angular.isObject(data)) {
        // TODO: proper error handling
        return;
      }

      if (isNewSearch) {
        clear();
        currentQuery = searchParams.query || null;
        currentFacets = searchParams.facets || [];
        currentFilters = searchParams.filters || [];
      }
      pagesLoaded += 1;

      var extendedDocs = angular.forEach(data.content.docs || [], function(doc) {
        angular.extend(doc, {_query: currentQuery, _page: pagesLoaded});
      });

      results = results.concat(extendedDocs);
      availableFacets = data.content.facets || [];
      availableFilters = data.content.filters || [];
      suggestions = data.content.suggestions || [];
      spellchecked = data.content.spellchecked || null;
      totalResults = data.content.numFound || 0;

      ebTrackService.trackSearch(currentQuery, totalResults, pagesLoaded);
    });

    jsonpRequest.error(function(data, status) {
      // TODO: proper error handling
      $log.error('error', status, data);
    });

    jsonpRequest.finally(function() {
      loading = false;
    });

    lastRequest = {
      isLoading: function() { return loading; },
      cancel: function() { canceller.resolve(); }
    };

    return jsonpRequest;
  };

  var newSearch = function(searchParams) {
    if (!angular.isObject(searchParams) || !searchParams.query) {
      throw new Error('Missing query parameter to newSearch()');
    }

    doSearch(searchParams, true);
  };

  var nextPage = function() {
    $log.debug('[SEARCH]', 'nextPage()');
    if (!currentQuery || pagesLoaded * ebConfig.pageRows >= totalResults) {
      $log.debug('No more pages to load');
      return;
    }

    doSearch({}, false);
  };

  return {
    data: function() {
      return {
        results: results,
        totalResults: totalResults,
        spellchecked: spellchecked,
        suggestions: suggestions,
        availableFacets: availableFacets
      };
    },
    isLoading: function() {
      return lastRequest !== null && lastRequest.isLoading();
    },
    newSearch: newSearch,
    nextPage: nextPage,
    clear: clear
  };
}]);
;
/* global ebApp:false */

ebApp.factory('ebTrackService', ['$http', '$q', '$document', '$log', 'ebPingService', 'ebConfig', function($http, $q, $document, $log, ebPingService, ebConfig) {
  'use strict';

  var doTrack = function(type, trackParams, extra) {
    debugger;
    ebPingService.getUserInfo.then(function(userInfo) {
      var params = angular.merge({}, trackParams, extra, userInfo);
      $log.info('[TRACKING]', type, params);

      if (!ebConfig.disableTracking) {
        $http.jsonp(ebConfig.url + '/services/' + type, {
          responseType: 'json',
          params: angular.merge({}, params, {jsonCallback: 'JSON_CALLBACK'})
        });
      }
    }, function() {
      $log.error('No userInfo available');
    });
  };

  var trackSearch = function(query, totalResults, page, extra) {
    doTrack('trackSearch', {
      q: query,
      totalHits: totalResults,
      page: page,
      scope: ebConfig.scope,
      referrer: $document.referrer
    }, extra || {});
  };

  var trackClick = function(query, page, title, url, extra) {
    doTrack('open', {
      q: query,
      page: page,
      title: title,
      url: url,
      scope: ebConfig.scope,
      follow: false
    }, extra || {});
  };

  var trackConversion = function(query, page, title, url, extra) {
    doTrack('conversion', {
      q: query,
      page: page,
      title: title,
      url: url,
      scope: ebConfig.scope,
      follow: false
    }, extra || {});
  };

  return {
    trackSearch: trackSearch,
    trackClick: trackClick,
    trackConversion: trackConversion
  };
}]);
;
angular.module('sbTemplates', []).run(['$templateCache', function($templateCache) {
  $templateCache.put("templates/bannerItem.html",
    "<a ng-href={{banner.url}} title={{banner.name}}><img ng-src={{banner.image}} title={{banner.name}} alt=\"{{banner.name}}\"></a>");
  $templateCache.put("templates/banners.html",
    "<div id=eb-banners><div ng-repeat=\"banner in banners\"><eb-banner-item ng-animate=\"'animate'\" position={{$index}} ng-repeat=\"banner in banners\" eb-position=$index banner=::banner last-page-element></div></div>");
  $templateCache.put("templates/categoryFacet.html",
    "<nav class=eb-nav-facet><div class=\"eb-header-facet closed\" ng-click=\"$parent.showFacet($event, facet.facet)\">{{('FACET_TITLE.' + (facet.facet | uppercase)) | translate}}</div><div class=eb-facet id=eb-facet-{{facet.facet}}><ul class=eb-facet-list id=eb-ul-{{facet.facet}}><eb-category-item ng-repeat=\"value in facet.values\" facet=value></eb-category-item></ul></div></nav>");
  $templateCache.put("templates/categoryItem.html",
    "<script type=text/ng-template id=subcategory.tpl><a ng-click=\"addDelFilter(facet, true)\">{{facet.value}} <span class=\"eb-facet-count\">({{facet.count}})</span></a>\n" +
    "	\n" +
    "	<ul class=\"eb-sub-facet\" ng-if=\"facet.values\">\n" +
    "		<li ng-repeat=\"facet in facet.values\" ng-class=\"{ 'eb-hl' : facet.selected == true}\" ng-include=\"'subcategory.tpl'\"></li>\n" +
    "	</ul></script><li ng-class=\"{ 'eb-hl' : facet.selected == true}\"><a ng-click=\"addDelFilter(facet, true)\">{{facet.value}} <span class=eb-facet-count>({{facet.count}})</span></a><ul class=eb-sub-facet ng-if=facet.values><li ng-repeat=\"facet in facet.values\" ng-class=\"{ 'eb-hl' : facet.selected == true}\" ng-include=\"'subcategory.tpl'\"></li></ul></li>");
  $templateCache.put("templates/facet.html",
    "<nav class=eb-nav-facet><div class=\"eb-header-facet closed\" ng-click=\"$parent.showFacet($event, facet.facet)\">{{('FACET_TITLE.' + (facet.facet | uppercase)) | translate}}</div><div class=eb-facet id=eb-facet-{{facet.facet}}><ul class=eb-facet-list id=eb-ul-{{facet.facet}}><li class=eb-param-{{facet.facet}} ng-repeat=\"value in facet.values\" ng-class=\"{ 'eb-hl' : value.selected == true}\"><a ng-if=standard_facet(value) ng-click=addDelFilter(value)>{{value.value}} <span class=eb-facet-count>({{value.count}})</span></a> <a ng-if=order_facet(value) ng-click=addDelFilter(value)>{{('FACET_TITLE.' + (value.value | uppercase)) | translate}}</a></li><li class=eb-param-{{facet.facet}} ng-repeat=\"value in facet.ranges\" ng-class=\"{ 'eb-hl' : value.selected == true}\"><a ng-click=addDelFilter(value)>{{value.start | ebCurrency:result.currency}} - {{value.end | ebCurrency:result.currency}} <span class=eb-facet-count>({{value.count}})</span></a></li></ul></div></nav>");
  $templateCache.put("templates/facets.html",
    "<div class=eb-refine ng-click=showFacets()><span translate=FACETS_REFINE_BY></span></div><div id=eb-facets ng-if=\"availableFacets.length > 0\"><div class=eb-current-facets ng-if=\"selectedFilters.length > 0\"><div class=eb-facets-box-title translate=FACETS_SELECTED></div><nav class=eb-nav-facet ng-repeat=\"filter in selectedFilters\"><div class=\"eb-header-facet current\" ng-click=removeFilter(filter)>{{filterValue(filter)}}</div></nav></div><div class=eb-facets-categories><eb-category-facet ng-repeat=\"facet in availableFacets | filter: categoriesFilter track by facet.facet\" facet=facet></eb-category-facet></div><div class=eb-facets-all><eb-facet ng-repeat=\"facet in availableFacets | filter: facetsFilter track by facet.facet\" facet=facet></eb-facet><eb-price-facet ng-if=showPriceFacet price-stats=priceStats></eb-price-facet></div></div>");
  $templateCache.put("templates/noResults.html",
    "<div id=eb-no-results><div><span translate=RESULTS_NORESULTS translate-value-query={{query}}></span></div><div class=eb-try>{{'TRY_AGAIN' | translate}}</div><div>{{'MAKE_SURE' | translate}}</div></div>");
  $templateCache.put("templates/priceFacet.html",
    "<nav class=eb-nav-facet><div class=\"eb-header-facet closed\" ng-click=\"$parent.showFacet($event, 'price_facet')\">{{'FACET_TITLE.PRICE_FACET' | translate}}</div><div class=eb-facet id=eb-facet-price_facet><data-range-slider data-floor={{price_min_range}} data-ceiling={{price_max_range}} data-ng-model-low=price_min data-ng-model-high=price_max></data-range-slider><div class=eb-price-count><span class=eb-price-min>{{price_min | ebCurrency:result.currency}}</span> <span class=eb-price-max>{{price_max | ebCurrency:result.currency}}</span></div><div class=eb-price-clean><span ng-click=cleanPrice()>{{'FACETS_CLEAN_PRICE' | translate}}</span></div></div></nav>");
  $templateCache.put("templates/promotedItem.html",
    "<div class=eb-result><div class=eb-result-image ng-if=\"promoted.image != undefined\"><a ng-href={{promoted.url}}><img alt={{promoted.name}} ng-src=\"{{promoted.image}}\"></a></div><div class=eb-result-name><a ng-href={{promoted.url}}>{{promoted.name}}</a></div></div>");
  $templateCache.put("templates/promoteds.html",
    "<div class=eb-text-recomended>{{'RESULTS_WE_RECOMMEND' | translate}}</div><div id=eb-promoteds><eb-promoted-item ng-animate=\"'animate'\" class=eb-article position={{$index}} ng-repeat=\"promoted in promoteds\" eb-position=$index promoted=::promoted last-page-element></div>");
  $templateCache.put("templates/result.html",
    "<div class=eb-result><div class=eb-result-image><a ng-href={{result.url}}><img alt={{result.name}} ng-src={{result.image}} ng-click=\"resultClicked($event)\"></a></div><div class=eb-result-name><a ng-href={{result.url}} ng-click=resultClicked($event)>{{result.name}}</a></div><div class=eb-result-price>{{result.price | ebCurrency:result.currency}}</div></div>");
  $templateCache.put("templates/results.html",
    "<div id=eb-before-results><div class=eb-total-results><span translate=RESULTS_FOUND translate-value-results={{totalResults}}></span></div><eb-facets available-facets=availableFacets selected-filters=selectedFilters price-stats=priceStats></eb-facets></div><div id=eb-results infinite-scroll infinite-scroll-enabled=\"false && totalResults > results.length && !isLoading\"><eb-banners banners=banners ng-if=showBanners()></eb-banners><eb-promoteds promoteds=promoteds ng-if=showPromoteds()></eb-promoteds><eb-suggestions query=query suggestions=suggestions ng-if=showSuggestions()></eb-suggestions><eb-spellcheck spellchecked=spellchecked query=query ng-if=showSpellcheck()></eb-spellcheck><eb-no-results query=query ng-if=showNoResults()></eb-no-results><div id=eb-articles><eb-result ng-animate=\"'animate'\" class=eb-article position={{$index}} ng-repeat=\"result in results track by result.id\" eb-position=$index eb-result=::result eb-last-page-element></div></div>");
  $templateCache.put("templates/root.html",
    "<div id=eb-searchField class=opened ng-controller=EmpathyBrokerController><div id=eb-header><eb-searchbox query=query on-change=resetFilters()></eb-searchbox></div><div id=eb-body ng-if=\"totalResults >= 0\"><eb-results query=query results=results suggestions=suggestions spellchecked=spellchecked toptrends=topTrends banners=banners promoteds=promoteds total-results=totalResults available-facets=availableFacets selected-filters=selectedFilters price-stats=priceStats load-more=loadMore()></eb-results></div></div>");
  $templateCache.put("templates/scrollButtom.html",
    "<div class=eb-scroll-box in-view=\"$inview && $inviewpart == 'both' && !isLoading && loadMore()\" ng-if=\"results.length < totalResults\"><div class=eb-scroll-prompt ng-if=!isLoading><span translate=SCROLL_FOR_MORE></span> <a ng-click=loadMore() translate=SCROLL_CLICK></a></div><div class=eb-scroll-prompt ng-if=isLoading><span translate=SCROLL_LOADING></span></div></div>");
  $templateCache.put("templates/searchbox.html",
    "<div class=left id=eb-logo><div class=eb-img-logo></div></div><div class=left id=eb-searchbox><input type=search id=eb-searchField-input placeholder={{inputPlaceholder}} ng-model=query ng-model-options=inputOptions autofocus autocomplete=\"off\"> <span class=eb-loading ng-if=isLoading translate=LOADING></span></div><div class=left id=eb-close-button><a class=eb-closed><span class=eb-close-text translate=CLOSE></span></a></div>");
  $templateCache.put("templates/spellcheck.html",
    "<div id=eb-spellcheck><span translate=RESULTS_SPELLCHECKED translate-value-query={{query}} translate-value-spellchecked={{spellchecked}}></span></div>");
  $templateCache.put("templates/suggestions.html",
    "<div id=eb-no-results-suggestions><span translate=RESULTS_SPELLCHECKED translate-value-query={{query}}></span></div><div id=eb-suggestions><div class=eb-suggestions id=eb-suggestion-{{getDivSuggestionId(suggestion.suggestion)}} ng-repeat=\"suggestion in suggestions\"><div class=eb-termSuggestion><span translate=RESULTS_SUGGESTION translate-value-results={{suggestion.numFound}} translate-value-suggestion={{suggestion.suggestion}}></span> <a class=eb-see-more ng-click=\"suggestionClicked($event, suggestion.suggestion)\" item={{getDivSuggestionId(suggestion.suggestion)}}>({{'SHOW_MORE' | translate }})</a></div><div class=eb-suggestion-list id=eb-suggestion-{{getDivSuggestionId(suggestion.suggestion)}}-items><eb-result ng-animate=\"'animate'\" class=eb-article position={{$index}} ng-repeat=\"suggestion in suggestion.docs\" eb-position=$index eb-result=::suggestion eb-last-page-element></div></div></div>");
}]);

}(window.angular, window, document));
