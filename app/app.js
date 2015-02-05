App = {

    _appVersion: "BETA 004",
    _testing: false,
    _dataPath: "",
    _vendorsLoaded: false,
    _countriesLoaded: false,
    _vendorData: [],
    _countryData: [],

    debug: function (message) {
        if (this._testing) { console.log(message) };
    },

    init: function (testing, dataPath) {
        this._testing = testing;
        this._dataPath = dataPath;
        this.debug("App.init, waiting for Document load");
        // init view
        this.initView();
        // wait for load
        this.wait();
    },    

    wait: function () {

        $(document).ready(function () {
            App.debug("Document Loaded")
            App.loadData();
        });
        
    },

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
                select.append($("<option/>", {
                    value: key,
                    text: value
                }));
            });

        }

        // everything loaded & processed?
        if ((this._vendorsLoaded == true) && (this._countriesLoaded == true)) {
            App.processingComplete();
        }

    },

    
    processingComplete: function() {
        // doc loaded, json loaded, data processed... let's start app
        App.start();
    },        

    

    start: function() {
        this.debug("App Ver: " + this._appVersion);
  
        // init ui 
        this.initUI();

        // listeners 
        this.initListeners();

        // init globe
        var globeWidth = window.innerWidth;
        var globeHeight = window.innerHeight;
        Globe.configure("globeHolder", globeWidth, globeHeight, "_globe/assets/");
        Globe.initGlobe(0, 0, "GMT", 0.0, false, 0);
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
            step: 0.01,
            value: 0,
            // "slide" (for constant updates) / "change" (for updates on release), 
            slide: function (event, ui) {
                App.listenerEvents.timelineChange(ui.value);
            }
        });

        if (screenfull.enabled) {
            $("#group_toggleFullscreen").show();
        } else {
            $("#group_toggleFullscreen").hide();
        }
    },
    
    initListeners: function () {
        $("#btn_play").click(this.listenerEvents.playClick);
        $("#btn_pause").click(this.listenerEvents.pauseClick);
        $("#btn_share").click(this.listenerEvents.shareClick);
        $("#btn_kiosk").click(this.listenerEvents.kioskClick);
        $("#btn_unkiosk").click(this.listenerEvents.unkioskClick);
        $("#check_factorDensity").change(this.listenerEvents.factorDensityChange);
        $("#select_handset").change(this.listenerEvents.handsetChange);
        $("#select_view").change(this.listenerEvents.viewChange);
        $("#select_time").change(this.listenerEvents.timeChange);
        $("#check_toggleFullscreen").change(this.listenerEvents.toggleFullscreenChange);
    },

    listenerEvents: {

        playClick: function () {
            App.togglePlay(false);
            Globe.timePlay(true);
        },

        pauseClick: function () {
            App.togglePlay(true);
            Globe.timePlay(false);
        },

        shareClick: function () {
            App.debug("share");
        },

        kioskClick: function () {
            App.toggleUI(false);
        },

        unkioskClick: function () {
            App.toggleUI(true);
        },

        factorDensityChange: function () {
            var factor = false;
            if ($('#check_factorDensity').is(':checked')) {
                factor = true;
            } 
            Globe.factorDensityChange(factor);
        },

        handsetChange: function () {
            var handset = $("#select_handset option:selected").val();
            Globe.handsetChange(handset);
        },

        viewChange: function () {
            var highValue =  $("#select_view option:selected").attr("highValue");
            var view = $("#select_view option:selected").val();
            Globe.viewChange(view, highValue);
        },

        timeChange: function () {
            var time = $("#select_time option:selected").val();
            Globe.timeChange(time);
        },

        timelineChange: function (timeline) {
            Globe.timelineChange(timeline);
        },

        toggleFullscreenChange: function () {
            if ($('#check_toggleFullscreen').is(':checked')) {
                App.debug("yes")
                if (screenfull.enabled) {
                    screenfull.request();
                }
            } else {
                if (screenfull.enabled) {
                    screenfull.exit();
                }
            }
        }

    },

    initView: function () {
        this.togglePlay(true);
    },

    togglePlay: function (showPlay) {
        if (showPlay) {
            $("#btn_play").show();
            $("#btn_pause").hide();
        } else {
            $("#btn_play").hide();
            $("#btn_pause").show();
        }
    },

    toggleUI: function (showUI) {
        if (showUI) {
            $(".footer").show();
            $(".footer").animate({ bottom: '0px' });
            $("#ui-form-holder").fadeIn();
            $("#ui-text-info").slideDown(600);
            $("#kiosk-nav").fadeOut(200);
        } else {
            $(".footer").animate({ bottom: '-170px' }, 600);
            $(".footer").delay(600).fadeOut(0);
            $("#ui-form-holder").fadeOut();
            $("#ui-text-info").slideUp(600);
            $("#kiosk-nav").delay(600).fadeIn(800);
        }
    }


}


