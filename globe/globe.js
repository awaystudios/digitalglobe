// A bridge to all TS functionality
// TODO: GlobeFacade is passed messily through a hacked window property. Must be "this._globeFacade = new GlobeFacade();" but can't get that to work :(
Globe = {

    _canvasTarget: "",
    _w: 300,
    _h: 400,
    _assets: "",
    _globeFacade: null,


    // ---------------------- init ----------------------------------

    configure: function (canvasTarget, w, h, assets) {
        // vars
        this._canvasTarget = canvasTarget;
        this._w = w;
        this._h = h;
        this._assets = assets;
    },
    
    initGlobe: function (view, handset, time, timeline, factorDensity, highValue) {
        // do something with the incoming params
        console.log("globe: initGlobe:", view, handset, time, timeline, factorDensity);
        // setup the globe based on config & params
        this._globeFacade = window["globeFacade"];
        this._globeFacade.init(this._canvasTarget, handset, view, highValue);
        this._globeFacade.setTimelineRatio(timeline);
    },

    // ----------------- public methods called by App ------------------------

    viewChange: function (view, highValue) {
        // TODO: For country view, pass in which type of country?
        console.log("globe: viewChange", view, 'highValue: ', highValue);
        this._globeFacade.setViewType(view, highValue);
    },

    handsetChange: function (handset) {
        // do something with the incoming params
        console.log("globe: handsetChange", handset);
        this._globeFacade.setHandSet(handset);
    },

    factorDensityChange: function (factor) {
        // do something with the incoming params
        console.log("globe: factorDensityChange", factor);
    },

    timeChange: function (time) {
        // do something with the incoming params
        console.log("globe: timeChange", time);
        this._globeFacade.setTimeType(time);
    },
    
    timelineChange: function (timeline) {
        // do something with the incoming params
        console.log("globe: setTimelineRatio", timeline);
        this._globeFacade.setTimelineRatio(timeline);
    },

    timePlay: function (play) {
        console.log("globe: setAutoCycleTime", play);
        this._globeFacade.setAutoCycleTime(play);
    },

    rotateGlobe: function (rotate) {
        console.log("globe: setAutoRotate", rotate);
        this._globeFacade.setAutoRotate(rotate);
    }
};