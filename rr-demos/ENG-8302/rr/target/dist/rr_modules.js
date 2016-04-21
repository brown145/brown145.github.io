
(function(angular, window, document, undefined) {
  'use strict';
/* exported rrApp */

var rrApp = angular.module('rrApp', ['ng', 'ngLocale', 'ngCookies', 'ngAnimate', 'sbTemplates', 'pascalprecht.translate', 'angular-inview']);
;
/* global window:false */
/* global document:false */
/* global rrApp:false */

window.richrelevanceSearchUI = {
  config: function(ebURL, config, rootElement) {
    'use strict';

    rrApp.config(['rrConfigProvider', '$compileProvider', '$translateProvider', function(rrConfigProvider, $compileProvider, $translateProvider) {
      var rrConfig = rrConfigProvider.setConfig(ebURL, config);
      $compileProvider.debugInfoEnabled(false);
      $translateProvider.preferredLanguage(rrConfig.displayLang);
      $translateProvider.fallbackLanguage('en');
    }]);

    if (!angular.isUndefined(rootElement)) {
      var root = angular.element(rootElement);

      rrApp.run(['$templateCache', function($templateCache) {
        root.html($templateCache.get('templates/root.html'));
      }]);

      angular.element(document).ready(function() {
        angular.bootstrap(root, ['rrApp'], {strictDi: true});
      });
    }
  }
};
;
/* global rrApp:false */
rrApp.provider('rrConfig', function() {
  'use strict';

  var DEFAULT_CONFIG = {
    lang: 'en',
    displayLang: 'en',
    scope: 'default',
    defaultCurrency: 'USD',
    currencySymbol: 1,
    pageRows: 20,
    disableTracking: false,
    cookieUserId: '__rr_user_id',
    cookieSessionId: '__rr_session_id',
    defaultImage: 'https://placehold.it/200x200'
  };

  var rrConfig = angular.extend({}, DEFAULT_CONFIG);
  this.setConfig = function(url, config) {
    rrConfig = angular.extend({}, DEFAULT_CONFIG, config, {url: url});
    return rrConfig;
  };

  this.$get = function() {
    return rrConfig;
  };

});
;
/* global rrApp:false */

rrApp.controller('RichRelevanceSearchController', ['$scope','$rootScope', '$location', '$log', 'rrSearchService', 'rrTrackService', 'rrConfig', '$timeout','$window', function($scope, $rootScope, $location, $log, rrSearchService, rrTrackService, rrConfig, $timeout, $window) {
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
      rrSearchService.clear();
      return;
    }

    rrSearchService.newSearch({
      query: $scope.query,
      filters: $scope.selectedFilters,
      commonObject: R3_COMMON || {},
      rcs: RR.c('rr_rcs')
    });

  };

  $scope.loadMore = function() {
    rrSearchService.nextPage();
  };

  $scope.$watchCollection(rrSearchService.data, function(data) {
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

  $scope.$watch(rrSearchService.isLoading, function(isLoading) {
    $scope.$broadcast('rrLoading', isLoading);
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

  $scope.$on('rrResultClicked', function($event, result) {
    var extraParams = {};
    $event.stopPropagation();

    if (R3_COMMON.userId) {
      extraParams.u = R3_COMMON.userId;
    }
    extraParams.lang = rrConfig.lang;
    extraParams.title = result.name;
    extraParams.url = result.url;

    rrTrackService.trackClick(result.id, result._query, result._page, R3_COMMON.sessionId, extraParams);
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
/* global rrApp:false */

rrApp.directive('rrBannerItem', ['rrConfig', function(rrConfig) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', rrConfig.defaultImage);
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
/* global rrApp:false */
rrApp.directive('rrBanners', [function() {
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
/* global rrApp:false */

rrApp.directive('rrCategoryFacets', [function() {
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
/* global rrApp:false */

rrApp.directive('rrFacet', [function() {
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
/* global rrApp:false */

rrApp.directive('rrFacets', [function() {
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
        angular.element('#rr-facets').toggle();
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

          angular.element('.rr-facets-all .rr-header-facet').removeClass('opened').addClass('closed');
          angular.element('.rr-facets-all .rr-facet').hide();

          $headerFacet.removeClass('closed').addClass('opened');
          angular.element('#rr-facet-' + value).show();
        } else {
          $headerFacet.removeClass('opened').addClass('closed');
          angular.element('#rr-facet-' + value).hide();
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
/* global rrApp:false */

rrApp.directive('infiniteScroll', ['rrMotionService', function(rrMotionService) {
  'use strict';

  return function($scope, $element) {

    var raw = $element[0];

    $element.bind('scroll', function() {
      var offset = rrMotionService.getArticleDimensions().height * 1.5;
      if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight - offset) {
        if (!$scope.isLoading) {
          $scope.loadMore();
        }
      }
    });
  };
}]);
;
/* global rrApp:false */
rrApp.directive('rrNoResults', [function() {
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
/* global rrApp:false */

rrApp.directive('rrPriceFacet', [function() {
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
/* global rrApp:false */

rrApp.directive('rrPromotedItem', ['rrConfig', 'rrMotionService', function(rrConfig, rrMotionService) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', rrConfig.defaultImage);
  };

  return {
    restrict: 'E',
    scope: {
      promoted: '='
    },
    link: function($scope, $element) {
      $element.find('img').one('error', errorHandler);

      $element.css({transform: rrMotionService.getTranslate('#rr-promoteds', $scope.position) });
      $element.css({opacity: 1 });
    },
    templateUrl: 'templates/promotedItem.html'
  };
}]);
;
/* global rrApp:false */

rrApp.directive('rrPromoteds', [function() {
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
/* global rrApp:false */

rrApp.directive('rrResult', ['$log', 'rrConfig', 'rrMotionService', function($log, rrConfig, rrMotionService) {
  'use strict';

  var errorHandler = function($event) {
    var image = angular.element($event.srcElement);
    image.attr('src', rrConfig.defaultImage);
  };

  return {
    restrict: 'E',
    templateUrl: 'templates/result.html',
    scope: {
      result: '=rrResult',
      position: '=rrPosition'
    },
    controller: ['$scope', function($scope) {
      $scope.resultClicked = function($event) {
        $event.preventDefault();
        $scope.$emit('rrResultClicked', $scope.result);
      };
    }],
    link: function($scope, $element) {
      $element.find('img').one('error', errorHandler);
      $element.css({transform: rrMotionService.getTranslate('#rr-articles', $scope.position)});
      $element.css({opacity: 1 });
    }
  };
}]);
;
/* global rrApp:false */

rrApp.directive('rrResults', ['rrMotionService', function(rrMotionService) {
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

      $scope.$on('rrLoading', function($event, loading) {
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
        angular.element('#rr-results').scrollTop(0);
      });

      $scope.$on('orderResults', function() {
        var $allDocs = angular.element('#rr-articles').find('.rr-article');

        for (var j = 0; j < $allDocs.length; j++) {
          var $doc = angular.element($allDocs[j]);
          $doc.css({transform: rrMotionService.getTranslate('#rr-articles', $doc.attr('position')) });
        }

        angular.element('#rr-articles').css({height: rrMotionService.getListHeight('#rr-articles', $allDocs.length)});
      });

      $scope.$on('orderSuggestions', function() {
        var $suggestionsLists = angular.element('.rr-suggestion-list');
        for (var i = 0; i < $suggestionsLists.length; i++) {
          var $suggestionList = angular.element($suggestionsLists[i]);
          var $suggestions = $suggestionList.find('.rr-article');

          $suggestionList.css({height: rrMotionService.getListHeight('#rr-suggestions', $suggestions.length)});

          for (var j = 0; j < $suggestions.length; j++) {
            var $suggestion = angular.element($suggestions[j]);
            $suggestion.css({transform: rrMotionService.getTranslate('#rr-suggestions', j) });
          }
        }
      });
    }]
  };
}]);
;
/* global rrApp:false */

rrApp.directive('rrScrollButtom', [function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/scrollButtom.html'
  };
}]);
;
/* global rrApp:false */

rrApp.directive('rrSearchbox', ['$translate', '$interval', 'rrConfig', function($translate, $interval, rrConfig) {
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
          default: rrConfig.inputDebounce || 500,
          search: 0
        }
      };

      // TODO: hacerlo con CSS
      $translate('SEARCHBOX_PLACEHOLDER').then(function(placeholderText) {
        $interval(function() {
          $scope.inputPlaceholder = placeholderText.substring(0, $scope.inputPlaceholder.length + 1);
        }, 100, placeholderText.length);
      });

      $scope.$on('rrLoading', function($event, loading) {
        $scope.isLoading = loading;
      });
    }]
  };
}]);
;
/* global rrApp:false */

rrApp.directive('rrSpellcheck', [function() {
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
/* global rrApp:false */

rrApp.directive('rrSuggestions', [function() {
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
        $scope.$emit('rrSuggestionClicked', suggestion);
      };
    }],
    templateUrl: 'templates/suggestions.html'
  };
}]);
;
/* global rrApp:false */

rrApp.filter('rrCurrency', ['$filter', 'rrConfig', function($filter, rrConfig) {
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
    var info = CURRENCY_SYMBOLS[inputCurrency] || CURRENCY_SYMBOLS[rrConfig.defaultCurrency] || CURRENCY_SYMBOLS.EUR;
    var value = $filter('number')((parseFloat(input) / 100), info[0] & 0x07);
    var space = (info[0] & 0x20) === 0 ? '' : ' ';
    var prefix = (info[0] & 0x10) === 0;
    var symbol = info[rrConfig.currencySymbol || 1];

    return prefix ? symbol + space + value : value + space + symbol;
  };

}]);
;
/* global rrApp:false */

rrApp.config(['$translateProvider', function($translateProvider) {
  'use strict';

  $translateProvider.translations('en', {
    SEARCHBOX_PLACEHOLDER: 'What are you looking for?',
    SPELLCHECKED: 'Results for "{{spellchecked}}"',
    RESULTS_FOUND: 'Found {{results}} results',
    RESULTS_NORESULTS: 'Sorry, we could not find results for "{{query}}"',
    RESULTS_SUGGESTION: 'We found {{results}} for {{suggestion}}:',
    RESULTS_SPELLCHECKED: 'No results found for search <span class="rr-spellcheck-bold">{{query}}</span> but we found results for search <span class="rr-spellcheck-bold">{{spellchecked}}</span>',
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
      CATEGORY_0_FACET: 'Category',
      BRAND_FACET: 'Brand',
      CATEGORIES_FACET: 'Category'
    },
    TRY_AGAIN: 'Try again!',
    MAKE_SURE: 'Make sure the text is correctly written  or try less specific search terms.',
    SHOW_MORE: 'show more'
  });

}]);
;
/* global rrApp:false */

rrApp.config(['$translateProvider', function($translateProvider) {
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
/* global rrApp:false */

rrApp.factory('rrMotionService', ['rrConfig', function(rrConfig) {
  'use strict';

  var getArticleDimensions = function() {
    var articleWidth = angular.element('.rr-result').first().outerWidth(true);
    var articleHeight = angular.element('.rr-result').first().outerHeight(true);

    return { height: articleHeight, width: articleWidth };
  };

  var getArticlesPerRow = function(containerWidth, articleWidth) {
    var articlesPerRow = Math.floor(containerWidth / articleWidth);

    return Math.min(articlesPerRow, rrConfig.maxArticlesPerRow || articlesPerRow);
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
/* global rrApp:false */

rrApp.factory('rrSearchService', ['$http', '$q', '$document', '$log', 'rrTrackService', 'rrConfig', function($http, $q, $document, $log, rrTrackService, rrConfig) {
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
      facet: isNewSearch ? searchParams.facets || [] : currentFacets,
      filter: isNewSearch ? searchParams.filters || [] : currentFilters,
      lang: rrConfig.lang,
      placements: rrConfig.searchPlacement || 'invalidPlacement',
      query: isNewSearch ? searchParams.query : currentQuery,
      rows: rrConfig.pageRows,
      session: searchParams.commonObject.sessionId || 'invalidSession',
      start: isNewSearch ? 0 : results.length
    };
    var extra = {};

    if (searchParams.commonObject.userId) {
      extra.user = searchParams.commonObject.userId;
    }

    if (searchParams.commonObject.channel) {
      extra.channel = searchParams.commonObject.channel;
    }

    if (searchParams.commonObject.regionId) {
      extra.region = searchParams.commonObject.regionId;
    }

    if ($document.referrer) {
      extra.pref = $document.referrer;
    }

    if (searchParams.rcs) {
      extra.rcs = searchParams.rcs;
    }

    $log.info('[SEARCH]', params);

    var loading = true;
    var canceller = $q.defer();
    var jsonpRequest = $http.jsonp(rrConfig.url + '/service/search/' + rrConfig.apiKey, {
      responseType: 'json',
      timeout: canceller.promise,
      params: angular.merge({}, params, extra, {
        callback: 'JSON_CALLBACK'
      })
    });

    jsonpRequest.success(function(data) {
      var searchPlacement;

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

      angular.forEach(data.placements || [], function(placement) {
        if (placement.placement === rrConfig.searchPlacement) {
          searchPlacement = placement;
        }
      });

      var extendedDocs = angular.forEach(searchPlacement.docs || [], function(doc) {
        angular.extend(doc, {
          _query: currentQuery,
          _page: pagesLoaded
        });
      });

      results = results.concat(extendedDocs);
      availableFacets = searchPlacement.facets || [];
      availableFilters = searchPlacement.filters || [];
      suggestions = searchPlacement.suggestions || [];
      spellchecked = searchPlacement.spellchecked || null;
      totalResults = searchPlacement.numFound || 0;

      // TODO: if searchPlacement.rcs exists persist it
      rrTrackService.trackSearch(currentQuery, totalResults, pagesLoaded, extra);
    });

    jsonpRequest.error(function(data, status) {
      // TODO: proper error handling
      $log.error('error', status, data);
    });

    jsonpRequest.finally(function() {
      loading = false;
    });

    lastRequest = {
      isLoading: function() {
        return loading;
      },
      cancel: function() {
        canceller.resolve();
      }
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
    if (!currentQuery || pagesLoaded * rrConfig.pageRows >= totalResults) {
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
/* global rrApp:false */

rrApp.factory('rrTrackService', ['$http', '$q', '$document', '$log', 'rrConfig', function($http, $q, $document, $log, rrConfig) {
  'use strict';

  var doTrack = function(type, trackParams, extra) {
    var canceller = $q.defer();
    var jsonpTrackingRequest = $http.jsonp(rrConfig.url + '/service/track/' + type + '/' + rrConfig.apiKey, {
      responseType: 'json',
      timeout: canceller.promise,
      params: angular.merge({}, trackParams, extra, {callback: 'JSON_CALLBACK'})
    });
    jsonpTrackingRequest.success(function(data) {
      // TODO: tracking request completed successfully, I dont think we need to do anything; but confirm
      $log.debug('[I DID STUFF]', data);
    });
    jsonpTrackingRequest.error(function(data, status) {
      // TODO:
      $log.error('[I think the API is not yet setup]', data, status);
    });
  };

  var trackSearch = function(query, totalResults, page, extra) {
    doTrack('search', {
      query: query,
      numFound: totalResults,
      page: page,
      pref: $document.referrer
    }, extra || {});
  };

  var trackClick = function(id, query, page, session, extra) {
    doTrack('click', {
      p: id,
      s: session,
      query: query,
      page: page,
      redirect: false
    }, extra || {});
  };

  var trackConversion = function(id, query, page, session, extra) {
    doTrack('conversion', {
      productId: id,
      s: session,
      query: query,
      page: page,
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
    "<div id=rr-banners><div ng-repeat=\"banner in banners\"><rr-banner-item ng-animate=\"'animate'\" position={{$index}} ng-repeat=\"banner in banners\" rr-position=$index banner=::banner last-page-element></div></div>");
  $templateCache.put("templates/categoryFacet.html",
    "<nav class=rr-nav-facet><div class=\"rr-header-facet closed\" ng-click=\"$parent.showFacet($event, facet.facet)\">{{('FACET_TITLE.' + (facet.facet | uppercase)) | translate}}</div><div class=rr-facet id=rr-facet-{{facet.facet}}><ul class=rr-facet-list id=rr-ul-{{facet.facet}}><rr-category-item ng-repeat=\"value in facet.values\" facet=value></rr-category-item></ul></div></nav>");
  $templateCache.put("templates/categoryItem.html",
    "<script type=text/ng-template id=subcategory.tpl><a ng-click=\"addDelFilter(facet, true)\">{{facet.value}} <span class=\"rr-facet-count\">({{facet.count}})</span></a>\n" +
    "	\n" +
    "	<ul class=\"rr-sub-facet\" ng-if=\"facet.values\">\n" +
    "		<li ng-repeat=\"facet in facet.values\" ng-class=\"{ 'rr-hl' : facet.selected == true}\" ng-include=\"'subcategory.tpl'\"></li>\n" +
    "	</ul></script><li ng-class=\"{ 'rr-hl' : facet.selected == true}\"><a ng-click=\"addDelFilter(facet, true)\">{{facet.value}} <span class=rr-facet-count>({{facet.count}})</span></a><ul class=rr-sub-facet ng-if=facet.values><li ng-repeat=\"facet in facet.values\" ng-class=\"{ 'rr-hl' : facet.selected == true}\" ng-include=\"'subcategory.tpl'\"></li></ul></li>");
  $templateCache.put("templates/facet.html",
    "<nav class=rr-nav-facet><div class=\"rr-header-facet closed\" ng-click=\"$parent.showFacet($event, facet.facet)\">{{('FACET_TITLE.' + (facet.facet | uppercase)) | translate}}</div><div class=rr-facet id=rr-facet-{{facet.facet}}><ul class=rr-facet-list id=rr-ul-{{facet.facet}}><li class=rr-param-{{facet.facet}} ng-repeat=\"value in facet.values\" ng-class=\"{ 'rr-hl' : value.selected == true}\"><a ng-if=standard_facet(value) ng-click=addDelFilter(value)>{{value.value}} <span class=rr-facet-count>({{value.count}})</span></a> <a ng-if=order_facet(value) ng-click=addDelFilter(value)>{{('FACET_TITLE.' + (value.value | uppercase)) | translate}}</a></li><li class=rr-param-{{facet.facet}} ng-repeat=\"value in facet.ranges\" ng-class=\"{ 'rr-hl' : value.selected == true}\"><a ng-click=addDelFilter(value)>{{value.start | rrCurrency:result.currency}} - {{value.end | rrCurrency:result.currency}} <span class=rr-facet-count>({{value.count}})</span></a></li></ul></div></nav>");
  $templateCache.put("templates/facets.html",
    "<div class=rr-refine ng-click=showFacets()><span translate=FACETS_REFINE_BY></span></div><div id=rr-facets ng-if=\"availableFacets.length > 0\"><div class=rr-current-facets ng-if=\"selectedFilters.length > 0\"><div class=rr-facets-box-title translate=FACETS_SELECTED></div><nav class=rr-nav-facet ng-repeat=\"filter in selectedFilters\"><div class=\"rr-header-facet current\" ng-click=removeFilter(filter)>{{filterValue(filter)}}</div></nav></div><div class=rr-facets-categories><rr-category-facet ng-repeat=\"facet in availableFacets | filter: categoriesFilter track by facet.facet\" facet=facet></rr-category-facet></div><div class=rr-facets-all><rr-facet ng-repeat=\"facet in availableFacets | filter: facetsFilter track by facet.facet\" facet=facet></rr-facet><rr-price-facet ng-if=showPriceFacet price-stats=priceStats></rr-price-facet></div></div>");
  $templateCache.put("templates/noResults.html",
    "<div id=rr-no-results><div><span translate=RESULTS_NORESULTS translate-value-query={{query}}></span></div><div class=rr-try>{{'TRY_AGAIN' | translate}}</div><div>{{'MAKE_SURE' | translate}}</div></div>");
  $templateCache.put("templates/priceFacet.html",
    "<nav class=rr-nav-facet><div class=\"rr-header-facet closed\" ng-click=\"$parent.showFacet($event, 'price_facet')\">{{'FACET_TITLE.PRICE_FACET' | translate}}</div><div class=rr-facet id=rr-facet-price_facet><data-range-slider data-floor={{price_min_range}} data-ceiling={{price_max_range}} data-ng-model-low=price_min data-ng-model-high=price_max></data-range-slider><div class=rr-price-count><span class=rr-price-min>{{price_min | rrCurrency:result.currency}}</span> <span class=rr-price-max>{{price_max | rrCurrency:result.currency}}</span></div><div class=rr-price-clean><span ng-click=cleanPrice()>{{'FACETS_CLEAN_PRICE' | translate}}</span></div></div></nav>");
  $templateCache.put("templates/promotedItem.html",
    "<div class=rr-result><div class=rr-result-image ng-if=\"promoted.image != undefined\"><a ng-href={{promoted.url}}><img alt={{promoted.name}} ng-src=\"{{promoted.image}}\"></a></div><div class=rr-result-name><a ng-href={{promoted.url}}>{{promoted.name}}</a></div></div>");
  $templateCache.put("templates/promoteds.html",
    "<div class=rr-text-recomended>{{'RESULTS_WE_RECOMMEND' | translate}}</div><div id=rr-promoteds><rr-promoted-item ng-animate=\"'animate'\" class=rr-article position={{$index}} ng-repeat=\"promoted in promoteds\" rr-position=$index promoted=::promoted last-page-element></div>");
  $templateCache.put("templates/result.html",
    "<div class=rr-result><div class=rr-result-image><a ng-href={{result.url}}><img alt={{result.name}} ng-src={{result.imageId}} ng-click=\"resultClicked($event)\"></a></div><div class=rr-result-name><a ng-href={{result.url}} ng-click=resultClicked($event)>{{result.name}}</a></div><div class=rr-result-price>{{result.priceCents | rrCurrency:result.currency}}</div></div>");
  $templateCache.put("templates/results.html",
    "<div id=rr-before-results><div class=rr-total-results><span translate=RESULTS_FOUND translate-value-results={{totalResults}}></span></div><rr-facets available-facets=availableFacets selected-filters=selectedFilters price-stats=priceStats></rr-facets></div><div id=rr-results infinite-scroll infinite-scroll-enabled=\"false && totalResults > results.length && !isLoading\"><rr-banners banners=banners ng-if=showBanners()></rr-banners><rr-promoteds promoteds=promoteds ng-if=showPromoteds()></rr-promoteds><rr-suggestions query=query suggestions=suggestions ng-if=showSuggestions()></rr-suggestions><rr-spellcheck spellchecked=spellchecked query=query ng-if=showSpellcheck()></rr-spellcheck><rr-no-results query=query ng-if=showNoResults()></rr-no-results><div id=rr-articles><rr-result ng-animate=\"'animate'\" class=rr-article position={{$index}} ng-repeat=\"result in results track by result.id\" rr-position=$index rr-result=::result rr-last-page-element></div></div>");
  $templateCache.put("templates/root.html",
    "<div id=rr-searchField class=opened ng-controller=RichRelevanceSearchController><div id=rr-header><rr-searchbox query=query on-change=resetFilters()></rr-searchbox></div><div id=rr-body ng-if=\"totalResults >= 0\"><rr-results query=query results=results suggestions=suggestions spellchecked=spellchecked toptrends=topTrends banners=banners promoteds=promoteds total-results=totalResults available-facets=availableFacets selected-filters=selectedFilters price-stats=priceStats load-more=loadMore()></rr-results></div></div>");
  $templateCache.put("templates/scrollButtom.html",
    "<div class=rr-scroll-box in-view=\"$inview && $inviewpart == 'both' && !isLoading && loadMore()\" ng-if=\"results.length < totalResults\"><div class=rr-scroll-prompt ng-if=!isLoading><span translate=SCROLL_FOR_MORE></span> <a ng-click=loadMore() translate=SCROLL_CLICK></a></div><div class=rr-scroll-prompt ng-if=isLoading><span translate=SCROLL_LOADING></span></div></div>");
  $templateCache.put("templates/searchbox.html",
    "<div class=left id=rr-logo><div class=rr-img-logo></div></div><div class=left id=rr-searchbox><input type=search id=rr-searchField-input placeholder={{inputPlaceholder}} ng-model=query ng-model-options=inputOptions autofocus autocomplete=\"off\"> <span class=rr-loading ng-if=isLoading translate=LOADING></span></div><div class=left id=rr-close-button><a class=rr-closed><span class=rr-close-text translate=CLOSE></span></a></div>");
  $templateCache.put("templates/spellcheck.html",
    "<div id=rr-spellcheck><span translate=RESULTS_SPELLCHECKED translate-value-query={{query}} translate-value-spellchecked={{spellchecked}}></span></div>");
  $templateCache.put("templates/suggestions.html",
    "<div id=rr-no-results-suggestions><span translate=RESULTS_SPELLCHECKED translate-value-query={{query}}></span></div><div id=rr-suggestions><div class=rr-suggestions id=rr-suggestion-{{getDivSuggestionId(suggestion.suggestion)}} ng-repeat=\"suggestion in suggestions\"><div class=rr-termSuggestion><span translate=RESULTS_SUGGESTION translate-value-results={{suggestion.numFound}} translate-value-suggestion={{suggestion.suggestion}}></span> <a class=rr-see-more ng-click=\"suggestionClicked($event, suggestion.suggestion)\" item={{getDivSuggestionId(suggestion.suggestion)}}>({{'SHOW_MORE' | translate }})</a></div><div class=rr-suggestion-list id=rr-suggestion-{{getDivSuggestionId(suggestion.suggestion)}}-items><rr-result ng-animate=\"'animate'\" class=rr-article position={{$index}} ng-repeat=\"suggestion in suggestion.docs\" rr-position=$index rr-result=::suggestion rr-last-page-element></div></div></div>");
}]);

}(window.angular, window, document));
