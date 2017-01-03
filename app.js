
var geolocationPromise;
function getGeolocation() {
  if(!geolocationPromise) {
    geolocationPromise = new Promise(function(resolve, reject){
      navigator.geolocation.getCurrentPosition(function(geo) {
        resolve(geo);
      }, reject);
    });
  }
  return geolocationPromise;
}

angular.module('SmashBoard', []).controller('TvController', function($scope, $http) {
  var now = Math.floor(new Date().getTime() / 1000);
  var url = 'http://redape.cloudapp.net/tvguidea/singleslot/'+now+'?channels=[1,159,63,64]&format=json&o=1'
  var ajaxPromise = $http.get(url);
  ajaxPromise.then(function weGotData(response) {
    $scope.channels = response.data.events;
  });
})
.controller('LoadtimeController', function($scope, $http, $q){
    $scope.check = function() {
        $scope.url = $scope.url || 'https://api.github.com/users/pedroluisf/repos';
        $scope.times = $scope.times || 10;
        var start = new Date();
        var promise;
        for(var i=0;i<$scope.times;i++) {
            if(!promise) {
                promise = $http.get($scope.url);
            } else {
                promise = promise.then(function() {
                    return $http.get($scope.url);
                });
            }
        }
        promise.then(function(){
            var duration = new Date() - start;
            $scope.duration = duration;
            $scope.average = duration / $scope.times;
        });
    };
    $scope.check();
})
.controller('RaceController', function($scope) {
  var car1 = document.getElementById('car1');
  var car2 = document.getElementById('car2');
  var car3 = document.getElementById('car3');
  var distance = document.getElementById('racetrack').scrollWidth - 121;
  var result = document.getElementById('result');
  var resultCar = document.getElementById('resultCar');
  function race(resolve, reject) {
    var car = this;
    car.reject = reject;
    car.interval = setInterval(function() {
      var moveBy = 1.2 + 2.5*Math.random();
      var current = parseInt(car.style.transform.split('(')[1].split(',')[0]);
      var newPos = current + moveBy;
      car.style.transform = 'translate3d('+ newPos + 'px,0,0)';
      if(newPos > distance) {
        resolve(car);
      }
    }, 10)
  }
  function reset() {
    // Reset the cars
    cars.forEach(function(car) {
      car.style.transform = 'translate3d(0,0,0)';
    });
    result.style.display = 'none';
  }

  var cars = [car1, car2, car3];
  $scope.start = function() {
    reset();
    var races = cars.map(function(car) {
      var carRace = new Promise(race.bind(car));
      carRace.then(function(){
        console.log(car.id + ' completed');
      }, function() {
        console.log(car.id + ' lost!');
      });
      return carRace;
    });
    Promise.race(races)
      .then(function(winningCar) {
        cars.forEach(function(car){
          car.reject();
          clearInterval(car.interval);
        });
        result.style.display = 'block';
        resultCar.setAttribute('src', winningCar.id+'.jpg');
        console.log('Race is over');
      })
  }
})
.controller('ITunesController', function($scope, ITunesService) {
  $scope.check = function() {
    ITunesService.search($scope.searchTerm).then(function(results) {
      $scope.results = results.slice(0,5);
    });
  }
})
.factory('ITunesService', function($http, $q) {
  var cachedResults = {};
  return {
    search: function(searchTerm) {
      return $q.when(cachedResults[searchTerm] || $http.jsonp('https://itunes.apple.com/search?media=movie&callback=JSON_CALLBACK&term='+searchTerm)
        .then(function(response) {
          cachedResults[searchTerm] = response.data.results;
          return response.data.results;
        })
      );
    }
  }
})
.controller('TodoController', function($scope, TodoService) {
  TodoService.load().then(function(todos) {
    $scope.todos = todos;
  });
  $scope.add = function() {
    TodoService.add($scope.what).then(function(added) {
      $scope.todos.push(added);
    });
    $scope.what = '';
  };
  $scope.clear = function() {
    TodoService.clear().then(function() {
      $scope.todos = [];
    });
  };
})
.factory('TodoService', function($q) {
  var service =  {
    add: function(todo) {
      return service.load().then(function(oldData) {
        oldData.push(todo);
        localStorage.setItem('todos', JSON.stringify(oldData));
        return todo;
      })
    },
    clear: function() {
      return $q.when(localStorage.removeItem('todos'));
    },
    load: function() {
      var data = localStorage.getItem('todos');
      return $q.when(JSON.parse(data) || []);
    }
  };
  return service;

})
.controller('VideoPlayerController', function($scope, $q, $http) {
    // Add the script itself
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var apiLoading = $q.defer();
    var apiReady = apiLoading.promise;

    window.onYouTubeIframeAPIReady = apiLoading.resolve;

    var videoPlayer;
    window.onPlayerStateChange = function(event) {
        if(event.data === YT.PlayerState.UNSTARTED) {
            videoPlayer = $q.defer();
            videoPlayer.promise.then(function() {
                $scope.status = 'Video is complete, try another one';
            })
        } else if(event.data === YT.PlayerState.ENDED) {
            videoPlayer.resolve();
        } else if(event.data === YT.PlayerState.PLAYING) {
            $scope.status = 'Playing';
        } else if(event.data === YT.PlayerState.PAUSED) {
            $scope.status = 'Paused';
        }
        try {
            $scope.$digest();
        }catch(e){}
    };

    apiReady.then(function() {
        $scope.status = 'API is ready';
        var playerReady = $q.defer();
        playerReady.promise.then(function(player) {
          $scope.status = 'Player is ready!';
        });
        var player = new YT.Player('twitch_embed_player', {
          height: '390',
          width: '640',
          videoId: 'M7lc1UVf-VE',
          events: {
            'onReady': function() {
                playerReady.resolve(player);
            },
            'onStateChange': onPlayerStateChange
          }
        });
    });
})
.controller('RepositoriesController', function($scope, GithubService) {
  $scope.getUserRepos = function() {
    GithubService.getRepoNames($scope.username)
      .then(function(repoNames) {
        $scope.repositories = repoNames;
      })
  }
})
/*
People in space API
http://api.open-notify.org/astros.json?callback=JSON_CALLBACK

ISS position API
http://api.open-notify.org/iss-now.json?callback=JSON_CALLBACK

More information about pass times:
http://open-notify.org/Open-Notify-API/ISS-Pass-Times/
*/
.controller('ISSController', function($scope, $http){
    $scope.iss = {};
    var peoplePromise = $http.jsonp('http://api.open-notify.org/astros.json?callback=JSON_CALLBACK');
    var positionPromise = $http.jsonp('http://api.open-notify.org/iss-now.json?callback=JSON_CALLBACK');
    peoplePromise.then(function(response) {
        $scope.iss.people = response.data.people;
    });

    positionPromise.then(function(response) {
        $scope.iss.latlng = response.data.iss_position;
    });
})
.controller('GithubRepoAvailabilityController', function($scope, GithubService) {
    $scope.checkRepoAvailability = function() {
        $scope.status = 'Checking';
        GithubService.checkRepoAvailability($scope.username, $scope.repository).then(function(status){
            $scope.status = status;
        }).catch(function(status) {
            $scope.status = 'An error has occurred: ' + status;
        });
    };
})
.factory('GithubService', function($http, $q){
  var service = {
    checkRepoAvailability: function(username, repoName) {
      return $http.get('https://api.github.com/repos/'+username+'/'+repoName)
        .then(function(response){
          return 'Not available';
        })
        .catch(function(response) {
          if(response.status === 404) {
            return 'Available';
          }
          return $q.reject(response.status);
        })
    },
    getRepos: function(username) {
      return $http.get('https://api.github.com/users/'+username+'/repos')
        .then(function(response) {
          return response.data;
        })
    },
    getRepoNames: function(username) {
      return service.getRepos(username)
      .then(function(data){
        return data.map(function(item) {
          return item.name;
        })
      });
    }
  };
  return service;
})
.controller('WeatherForecastController', function($scope, $http, LocationService, $q){
  /* URLs for the APIs:
  -> Google Geocode
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+geo.coords.latitude+','+geo.coords.longitude;
  -> AccuWeather city to id
  var url = 'http://apidev.accuweather.com/locations/v1/search?apikey=meSocYcloNe&q='+city
  -> AccuWeather id to forecast
  var url = 'http://apidev.accuweather.com/currentconditions/v1/'+result.Key+'.json?language=en&apikey=meSocYcloNe'
  */
  LocationService.getGeolocation()
    .then(function(geo) {
        $scope.latlng = geo.coords.latitude + ', ' + geo.coords.longitude;
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+geo.coords.latitude+','+geo.coords.longitude;
        return $http.get(url);
    })
    .then(function(response) {
      if(response.data.status === 'ZERO_RESULTS') {
        return $q.reject('No results');
      }
        var data = response.data;
        var result = data.results[0];
        var components = result.address_components;
        var query = [];
        for(var c in components) {
            c = components[c];
            if(c && c.types.indexOf('locality') !== -1 || c.types.indexOf('country') !== -1) {
                query.push(c.long_name);
            }
        }
        $scope.city = query.join(', ');
        var city = query.join(',');
        var url = 'http://apidev.accuweather.com/locations/v1/search?apikey=meSocYcloNe&q='+city;
        return $http.get(url)
    }).then(function(response) {
        var result = response.data[0];
        var url = 'http://apidev.accuweather.com/currentconditions/v1/'+result.Key+'.json?language=en&apikey=meSocYcloNe';
        return $http.get(url);
    }).then(function(response){
        $scope.weather = response.data[0].WeatherText;
        $scope.temperature = response.data[0].Temperature.Metric.Value;
    });
})
.controller('RepositoriesController', function($scope, GithubService) {
    $scope.getUserRepos = function() {
        GithubService.getRepoNames($scope.username).then(function(names) {
            $scope.repositories = names;
        });
    };
})
.controller('LocationController', function($scope, LocationService){
  LocationService.getGeolocation().then(function geolocationReceived(geoposition) {
    $scope.coordinates = geoposition.coords;
    $scope.$digest();
  }).catch(function(){
    $scope.coordinates = {latitude: 'N/A', longitude: 'N/A'};
    $scope.$digest();
  });
}).factory('LocationService', function($q) {
  return {
    getGeolocation: function() {
      return getGeolocation();
    }
  };
});
document.addEventListener("DOMContentLoaded", function(event) {
  var address = document.getElementById('address');
  getGeolocation().then(function(geolocation){
    var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='
      +geolocation.coords.latitude + ','
      +geolocation.coords.longitude;

    var client = new XMLHttpRequest();
    client.onload = function() {
      address.innerText = JSON.parse(this.response).results[0].formatted_address;
    }
    client.open('GET', url);
    client.send();

  }).catch(function(){
    address.innerText = 'N/A';
  })
});
document.addEventListener("DOMContentLoaded", function(event) {
  var input = document.getElementById('city-input');
  var city = document.getElementById('city-name');
  // Keeping the reject function as an object outside, will allow us to "cancel" any other pending promises
  var rejectFunction;
  input.addEventListener('keyup', function() {
    // If anything is pending, just invoke the "cancel" method
    if(rejectFunction) {
      rejectFunction();
    }
    var myPromise = new Promise(function(resolve, reject){
      rejectFunction = reject;
      var start = new Date();
      getGeolocation().then(function(geolocation) {
        var client = new XMLHttpRequest();
        client.onload = function() {
          resolve([JSON.parse(this.response).results[0], new Date() - start]);
        }
        var coords = geolocation.coords;
        var bounds = (coords.latitude -0.1) + ',' + (coords.longitude -0.1) + '|' + (coords.latitude +0.1) + ',' + (coords.longitude +0.1);

        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address='
          +input.value+'&sensor=false'
          +'&bounds='+bounds;
        client.open('GET', url);
        client.send();
      })

    });

    myPromise.then(function(data) {
      var result = data[0];
      var duration = data[1];
      if(result) {
        city.innerText = result.formatted_address;
        document.getElementById('load-time').innerText = duration/1000 + 's';
      }
    })
  })
});
document.addEventListener("DOMContentLoaded", function(event) {
  var charging = document.getElementById('charging');
  var level = document.getElementById('battery-level');

  navigator.getBattery().then(function(batteryManager) {
    charging.innerText = batteryManager.charging  ? 'Yes' : 'No';
    level.innerText = (batteryManager.level * 100)+'%';
    level.className = 'fa fa-battery-' + Math.round(batteryManager.level * 4);
  })
});
document.addEventListener("DOMContentLoaded", function(event) {
  var click = document.getElementById('click-me');
  var last = document.getElementById('last');
  click.addEventListener('mousedown', function() {
    var clicking = new Promise(function executor(resolve, reject) {
      var start = new Date();
      click.onmouseout = reject;

      click.onmouseup = function() {
        resolve(new Date() - start);
      }
    });

    clicking.then(function(duration) {
      last.innerText = (duration/1000) + ' seconds';
    }, function(message) {
      window.alert('Challenge incomplete');
    })
  })
});
document.addEventListener("DOMContentLoaded", function(event) {
  var input = document.getElementById('say-what');
  var output = document.getElementById('status');
  input.addEventListener('blur', function() {
    var speaking = new Promise(function executor(success, failure) {
      // var duration = Math.random() * 10000;
      // setTimeout(function() {
      //   success({
      //     elapsedTime: duration
      //   });
      // }, duration);
      var msg = new SpeechSynthesisUtterance(input.value);
      msg.onend = success;
      speechSynthesis.speak(msg);
    });
    output.innerText = 'Speaking';
    speaking.then(function(event) {
      output.innerText = 'Speech completed in '+event.elapsedTime/1000+ ' seconds';
    });
  });
});
