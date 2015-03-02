App = {

    _appVersion: "BETA 004",
    _testing: false,
    _dataPath: "",
    _vendorsLoaded: false,
    _countriesLoaded: false,
    _vendorData: [],
    _countryData: [],
    _vendorID: -1,
    _vendorColor: "83b1ff",
    _vendorName: null,
    _fodf: null,
    _factorDensity: false,
    _shareEnabled: false,
    _kioskMode: false,
    _autoKioskDelay: 20000,
    _userInactiveFor: 0,
    _userActiveCheck: null,
    _userActiveCheckInterval:1000,
    _autoPlayer: null,
    _autoPlaying: false,
    _autoPlayInterval: 50,
    _timelineScrubberStep:0.0025,
    

    debug: function (message) {
        if (this._testing) { console.log(message) };
    },

    init: function (testing, dataPath, fodf) {
        this._testing = testing;
        this._dataPath = dataPath;
        this._fodf = fodf;
        this.debug("App.init, waiting for Document load");
        // init view
        this.initView();
        // wait for load
        //this.wait();
        App.loadData();
    },    

    //wait: function () {

    //    $(document).ready(function () {
    //        App.debug("Document Loaded")
    //        App.loadData();
    //    });
        
    //},

    loadData: function () {
        var vendorDataURL = this._dataPath + "vendors.json";
        var countryDataURL = this._dataPath + "countries.json";
        
        // load vendors
        App.debug("loading JSON: " + vendorDataURL);
        $.getJSON(vendorDataURL)
		.success(function(data) {
		    App.processData("vendors", data);
		}).fail(function(d) {
		    loadFailed();
		});

        // load countries
        App.debug("loading JSON: " + countryDataURL);
        $.getJSON(countryDataURL)
		.success(function (data) {
		    App.processData("countries", data);
		}).fail(function (d) {
		    console.log(d);
		    loadFailed();
		});

        function loadFailed() {
            // handle error dialog
            App.debug("Error: One of the JSON files failed to load.")
        }
    },

    processData: function (type, data) {

        // assign data to variables, and create select <options>

        if (type == "countries") {

            this._countriesLoaded = true;
            this._countryData = data;
            var select = $('#select_view');

            // each country in array
            $.each(this._countryData, function (key, value) {
                for(var first in value) break;
                var highValue = value[first];

                select.append($("<option/>", {
                    value: key,
                    text: first,
                    highValue:highValue
                }));
            });

        } else if (type == "vendors") {

            this._vendorsLoaded = true;
            this._vendorData = data;
            var select = $('#select_handset');

            // each vendor in array
            $.each(this._vendorData, function (key, value) {
                for(var first in value) break;
                var hexColor = value[first];

                select.append($("<option/>", {
                    value: key,
                    text: first,
                    color: hexColor
                }));
            });
            
        }

        // everything loaded & processed?
        if ((this._vendorsLoaded == true) && (this._countriesLoaded == true)) {
            App.processingComplete();
        }
        
    },

    
    processingComplete: function () {
        // let's set the handset vendor
        App.processFODF();
        // doc loaded, json loaded, data processed... let's start app
        App.start();
    },

    getParameterByName: function (name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    },

    processFODF: function () {

        // if fodf handset returned from 51D (even unknown) then check against Vendor List.
        if (App._fodf != null) {

            // replace selected vendor IDs if detected
            if (App._fodf.HardwareVendor == "RIM") {
                App._fodf.HardwareVendor = "BlackBerry";
            }

            if (App._fodf.HardwareVendor == "Motorola") {
                App._fodf.HardwareVendor = "Lenovo";
            }


            App._vendorName = App._fodf.HardwareVendor;
            App.debug("Handset detected as: " + App._vendorName);

            // each vendor in array (check if match of users handset)
            $.each(this._vendorData, function (key, value) {
                for(var vendor in value) break;
                if (vendor == App._vendorName) {
                    App._vendorID = key;
                    App._vendorColor = value[vendor];
                }
            });

        }

        // overwrite vendor ID detected with querystring if requested & matched
        var qsHardwareVendor = App.getParameterByName('HardwareVendor')

        if (qsHardwareVendor != "") {

            // replace selected vendor IDs if detected
            if (qsHardwareVendor == "RIM") {
                qsHardwareVendor = "BlackBerry";
            }

            if (qsHardwareVendor == "Motorola") {
                qsHardwareVendor = "Lenovo";
            }


            //App._vendorName = qSHardwareVendor;
            App.debug("HardwareVendor requested from QueryString: " + qsHardwareVendor);

            // each vendor in array (check if match of querystring hardware)
            $.each(this._vendorData, function (key, value) {
                for (var vendor in value) break;
                if (vendor.toLowerCase() == qsHardwareVendor.toLowerCase()) {
                    App._vendorName = qsHardwareVendor;
                    App._vendorID = key;
                    App._vendorColor = value[vendor];
                }
            });

        }

        

        // if vendorID still unknown, generate random
        if (App._vendorID == -1) {
            App._vendorID = App.getRandomInt(0, App._vendorData.length-1);
            var value = App._vendorData[App._vendorID];
            for(var vendor in value) break;
            App._vendorColor = value[vendor];
        };
    },

    getRandomInt: function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    start: function() {
        this.debug("App Ver: " + this._appVersion);
        
        // remove loader
        

        // show intro sequence
        //this.introInfoSequence();

        // init ui 
        this.initUI();

        // listeners 
        this.initListeners();

        // init globe
        var globeWidth = window.innerWidth;
        var globeHeight = window.innerHeight;

        // delayed globe load, to stop 3rd party libs (GA/Share) casuing error
        //setTimeout(function () {
            Globe.configure("globeHolder", globeWidth, globeHeight, "_globe/assets/");
            Globe.initGlobe(0, App._vendorID, App._vendorColor, "GMT", 0.0, App._factorDensity, 0, this.listenerEvents.updateView);
        //}, 10000);

        
    },

    introInfoSequence: function () {
        $("#loader").fadeOut(500);
        $("#info_step01").delay(2000).fadeIn(500).delay(2000).fadeOut(250);
        $("#info_step02").delay(5500).fadeIn(500).delay(2000).fadeOut(250);
        $("#info_step03").delay(9000).fadeIn(500);
        $("#info").delay(11000).fadeOut(250);
    },

    initUI: function() {
        

        $('.custom-select').customSelect();

        // show footer control content
        $(".footer .container").show();

        // setup slider 
        $("#slider_timeline").slider({
            //disabled: true
            min: 0,
            max: 1,
            step: App._timelineScrubberStep,
            value: 0,
            // "slide" (for constant updates) / "change" (for updates on release), 
            slide: function (event, ui) {
                App.listenerEvents.timelineChange(ui.value);
            }
        });

        if (screenfull.enabled) {
            $("#btn_fullscreen").show();
        } else {
            $("#btn_fullscreen").hide();
        }

        // show & set handset select
        $('#ui_handset #select_handset').css('display', 'block');
        this.switchHandsetView(App._vendorID);
        $('#ui_handset #select_handset').val(App._vendorID);

        // show non kiosk mode at start
        this.toggleKioskMode(false);
    },
    
    initListeners: function () {
        $("#btn_play").click(this.listenerEvents.playPauseClick);
        $("#btn_pause").click(this.listenerEvents.playPauseClick);
        $("#btn_share").click(this.listenerEvents.shareClick);
        $("#btn_kiosk").click(this.listenerEvents.kioskClick);
        $("#btn_unkiosk").click(this.listenerEvents.unkioskClick);
        $("#btn_factorDensity").click(this.listenerEvents.factorDensityChange);
        $("#select_handset").change(this.listenerEvents.handsetChange);
        $("#select_view").change(this.listenerEvents.viewChange);
        $("#select_time").change(this.listenerEvents.timeChange);
        $("#btn_fullscreen").click(this.listenerEvents.toggleFullscreenChange);
        // longer drag type events
        $("#globeHolder, .ui-slider-handle").mousedown(this.listenerEvents.userDragging);
        $("#globeHolder, .ui-slider-handle").mouseup(this.listenerEvents.userStopDragging);
        $("#globeHolder, .ui-slider-handle").touchstart(this.listenerEvents.userDragging);
        $("#globeHolder, .ui-slider-handle").touchend(this.listenerEvents.userStopDragging);
        // any general clicks or taps
        $("#select_handset").click(this.listenerEvents.userClicking);
        $("#select_handset").tap(this.listenerEvents.userClicking);
    },

    listenerEvents: {

        playPauseClick: function () {
            if (App._autoPlaying) {
                App._autoPlaying = false;
                App.stopAutoplay();
                App.togglePlay(false);
            } else {
                App._autoPlaying = true;
                App.startAutoplay();
                App.togglePlay(true);
            }
            //App.listenerEvents.userClicking();
        },

        shareClick: function () {
            if (App._shareEnabled) {
                App.toggleShareUI(false);
            } else {
                App.toggleShareUI(true);
            }
            App.listenerEvents.userClicking();
        },

        kioskClick: function () {
            App.toggleKioskMode(true);
        },

        unkioskClick: function () {
            App.toggleKioskMode(false);
        },

        factorDensityChange: function () {
            if (!App._factorDensity) {
                App._factorDensity = true;
                $('#btn_factorDensity').css('background-image', 'url(assets/ui/btn_population_on.png)');
            } else {
                App._factorDensity = false;
                $('#btn_factorDensity').css('background-image', 'url(assets/ui/btn_population_off.png)');
            }
            Globe.factorDensityChange(App._factorDensity);
            App.listenerEvents.userClicking();
        },

        handsetChange: function () {
            var handset = $("#select_handset option:selected").val();
            var handsetColor = $("#select_handset option:selected").attr("color");
            Globe.handsetChange(handset, handsetColor);
            App.switchHandsetView(handset);
            App.listenerEvents.userClicking();
        },

        viewChange: function () {
            var highValue =  $("#select_view option:selected").attr("highValue");
            var view = $("#select_view option:selected").val();
            Globe.viewChange(view, highValue);
        },

        updateView: function(id){
            $("#select_view").val(id).change();
        },

        timeChange: function () {
            var time = $("#select_time option:selected").val();
            Globe.timeChange(time);
        },

        timelineChange: function (timeline) {
            Globe.timelineChange(timeline);
        },

        toggleFullscreenChange: function () {
            if (!screenfull.isFullscreen) {
                screenfull.request();
                $('#btn_fullscreen').css('background-image', 'url(assets/ui/btn_fullscreen_undo.png)');
            } else {
                screenfull.exit();
                $('#btn_fullscreen').css('background-image', 'url(assets/ui/btn_fullscreen.png)');
            }
            App.listenerEvents.userClicking();
        },
        
        userDragging: function () {
            App.stopActiveCheck();
            App.toggleUI(true);
        },

        userStopDragging: function () {
            App.startActiveCheck();
        },

        userClicking: function () {
            App.resetUserInactivity();
            App.toggleKioskMode(false);
        }

    },

    initView: function () {
        this.togglePlay(false);
    },

    togglePlay: function (play) {
        if (play) {
            $("#btn_play").hide();
            $("#btn_pause").show();
        } else {
            $("#btn_play").show();
            $("#btn_pause").hide();
        }
    },

    toggleUI: function (showUI) {
        if (showUI) {
            $(".footer").show();
            $(".footer").animate({ bottom: '0px' });
            $("#ui-text-info").slideDown(600);
            $("#kiosk-nav").fadeOut(200);
            // cancel rotate globe
            try {
                Globe.rotateGlobe(false);
            } catch (err) {
                // first run, globefacade likley not processed yet
            }
            // stop time playing
            App._autoPlaying = false;
            App.togglePlay(false);
            App.stopAutoplay();
        } else {
            $(".footer").animate({ bottom: '-170px' }, 600);
            $(".footer").delay(600).fadeOut(0);
            $("#ui-text-info").slideUp(600);
            $("#kiosk-nav").delay(600).fadeIn(800);
            // rotate globe
            try {
                Globe.rotateGlobe(true);
            } catch (err) {
                // first run, globefacade likley not processed yet
            }
            // start time playing
            App._autoPlaying = true;
            App.togglePlay(true);
            App.startAutoplay();
        }
    },

    switchHandsetView: function (handset) {
        var handsetObj = App._vendorData[handset];
        for(var handsetStr in handsetObj) break;

        handsetStr = handsetStr.replace(/ /g, "").toLowerCase();
        var logoURL = 'assets/ui/' + 'handset_' + handsetStr + '.png';
        $('#ui_handset .customSelect').css('background-image', 'url(' + logoURL + ')');
    },

    toggleShareUI: function (showShare) {
        if (showShare) {
            $("#share-holder").fadeIn(200);
            App._shareEnabled = true;
        } else {
            $("#share-holder").fadeOut(200);
            App._shareEnabled = false;
        }
    },

    toggleKioskMode: function (doKiosk) {
        if (doKiosk) {
            App._kioskMode = true;
            App.toggleUI(false);
            App.toggleShareUI(false);
            // stop checking for user inactivity
            App.stopActiveCheck();
            
        } else {
            App._kioskMode = false;
            App.toggleUI(true);
            // start checking for user inactivity
            App.startActiveCheck();
            
            
        }

    },

    startActiveCheck: function () {
        App.debug("Start: checking for user inactive");
        clearInterval(App._userActiveCheck);
        App.resetUserInactivity();
        App._userActiveCheck = setInterval(App.checkForUserInactive, App._userActiveCheckInterval);
    },

    stopActiveCheck: function () {
        App.debug("Stop: checking for user inactive");
        clearInterval(App._userActiveCheck);
    },

    checkForUserInactive: function () {
        App._userInactiveFor += App._userActiveCheckInterval;
        if (App._userInactiveFor >= App._autoKioskDelay) {
            App.toggleKioskMode(true);
        }
    },

    resetUserInactivity: function () {
        App.debug("User Active");
        App._userInactiveFor = 0;
    },

    startAutoplay: function () {
        App.debug("Start: Autoplay");
        clearInterval(App._autoPlayer);
        App._autoPlayer = setInterval(App.autoplay, App._autoPlayInterval);
    },

    stopAutoplay: function () {
        App.debug("Stop: Autoplay");
        clearInterval(App._autoPlayer);
    },

    autoplay: function () {
        var nextVal = $("#slider_timeline").slider("value") + App._timelineScrubberStep;
        if (nextVal >= 1) {
            nextVal = 0;
        }
        $("#slider_timeline").slider({ value: nextVal });
        App.listenerEvents.timelineChange(nextVal);
    }






}


