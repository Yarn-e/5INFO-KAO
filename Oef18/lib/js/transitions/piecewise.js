/****************************************************
 * Copyright © Legwork Studio. All Rights Reserved.
 * Updated by: Joseph Smith, 29-May-2011
 ****************************************************/

var  piecewise = piecewise || {};

piecewise.segments = (function($){
    
    /****************************** 
     * Public.
     *****************************/
     var pub = {},
     
    /****************************** 
     * Vars
     *****************************/
    normalizedTransitionObject = {
        transition_event: 'transitionend',
        transition_prefix: undefined
    },
    $controls = $("#transition-controls .rounded-container"),
    $stage = $('#transition-stage'),
    $ball = $('#ball', '#transition-stage'),
    $text = $('#text', '#transition-stage'),
    $actors = $('#transition-stage > div'),
    $currentActor,
    animationTimer,
    animationStateCounts,
    statePre = 'state_',
    
    /****************************************************
     * _appendElements:void                             *
     *                                                  *
     * Does some DOM prep and adds elems                *
     ****************************************************/
     
    _appendElements = function(){
        var timing_functions_map = [
                {
                    optTitle: 'ease',
                    optVal: [0.25, 0.1, 0.25, 1.0]
                },
                {
                    optTitle: 'linear',
                    optVal: [0.0, 0.0, 1.0, 1.0]
                },
                {
                    optTitle: 'ease-in',
                    optVal: [0.42, 0.0, 1.0, 1.0]
                },
                {
                    optTitle: 'ease-out',
                    optVal: [0.0, 0.0, 0.58, 1.0]
                },
                {
                    optTitle: 'ease-in-out',
                    optVal: [0.42, 0.0, 0.58, 1.0]
                }
            ],
            animation_types_map = [
                {
                    optTitle: 'Position',
                    optVal: 'positions'
                },
                {
                    optTitle: 'Background Color',
                    optVal: 'background-color'
                },
                {
                    optTitle: 'Zooming',
                    optVal: 'zooming'
                },
                {
                    optTitle: 'Letter Spacing (webkit & Opera)',
                    optVal: 'letter-spacing'
                }
            ],
            
            $animationTypeContainer = $('<div />').attr({'id': "animation-type-wrap", 'class': 'control-wrap'}),
            $easingSetContainer = $('<div />').attr({'id': "easing-set-wrap", 'class': 'control-wrap'}),
            
            optionsBuilder = function(arr){
                var optBuffer = [];
                
                for(var i=0; i<arr.length; i++){
                    optBuffer.push('<option value="');
                    optBuffer.push( (arr[i].optVal instanceof Array) ? arr[i].optVal.join(',') : arr[i].optVal );
                    optBuffer.push('">');
                    optBuffer.push(arr[i].optTitle);
                    optBuffer.push('</option>');
                }
                return optBuffer.join('');
            },
            
            animationOpts = optionsBuilder(animation_types_map),
            easingOpts = optionsBuilder(timing_functions_map);

        $animationTypeContainer.append('<label for="type">Animation:</label><select id="type">'+animationOpts+'</select>');
        $easingSetContainer.append('<label for="easing">Easing:</label><select id="easing">'+easingOpts+'</select>');
        
        $controls.append($animationTypeContainer, $easingSetContainer);
    },
    
    /****************************************************
     * _setTransition:String                            *
     *                                                  *
     * What kind of tranistion do we support?           *
     ****************************************************/
     
    _setTransition = function(){
        var transition,
            types = ['transition', 'webkitTransition', 'OTransition', 'MozTransition'],
            style;
            
        if (!window.getComputedStyle) { transition = null; }

        style = window.getComputedStyle(document.documentElement, null);
        
        for (var i=0; i < types.length; i++) {
            if (types[i] in style) { transition = types[i]; }
        }
        
        return transition;
    },
    
    /****************************************************
     * _normalizeTransitionEvent:void                   *
     *                                                  *
     * Normalizes our Transitions                       *
     ****************************************************/
     
    _normalizeTransitionEvent = function(transition){
        
        switch(transition){
            case 'webkitTransition':
                normalizedTransitionObject.transition_event = transition + 'End';
                normalizedTransitionObject.transition_prefix = "-webkit-transition-timing-function: ";
                break;
            case 'OTransition':
                normalizedTransitionObject.transition_event = transition + 'End';
                normalizedTransitionObject.transition_prefix = "-o-transition-timing-function: ";
                break;
            case 'MozTransition':
                normalizedTransitionObject.transition_prefix = "-moz-transition-timing-function: ";
                break;
        }
    },
    
    /****************************************************
     * _parseCurrentState:Number                        *
     *                                                  *
     * Grab the current state from our $currentActor    *
     ****************************************************/
     
    _parseCurrentState = function(){
        var state,
            classArr = $currentActor.attr('class').split(' ');
        
        for(var i=0; i<classArr.length; i++){
            if(classArr[i].search(statePre) != -1) { 
                state = parseInt(classArr[i].substr(classArr[i].indexOf('_')+1));
            }
            else if(classArr[i].search('init') != -1) { state = 0; }
        }
        
        return state;
    },
    
    /****************************************************
     * _stateChanger:void                               *
     *                                                  *
     * Update the $currentActor state class             *
     ****************************************************/
     
    _stateChanger = function(){
        var currentState = _parseCurrentState(),
            newState;
        
        for(var i=0; i<animationStateCounts; i++ ){
            if (currentState+1 > animationStateCounts-1) { newState = 0; }
            else { newState = currentState+1; }
        }
        
        $currentActor.removeClass(statePre+currentState).addClass(statePre+newState);
    },
    
    /****************************************************
     * _binds:void                                      *
     *                                                  *
     * All of our bindings / listeners                  *
     ****************************************************/
     
    _binds = function(){
        
        $('#splines').bind('mouseup.piecewise', function(e){
          document.getElementById('easing').selectedIndex = 5;
        });
        
        $('#easing').bind('change.piecewise', function(e){
            var $selected = $(this).find(':selected'),
                selVal = $selected.val(),
                selTitle = $selected.html(),
                easing = (selTitle.indexOf('custom') != -1) 
                    ? normalizedTransitionObject.transition_prefix+'cubic-bezier('+selVal+')'
                    : normalizedTransitionObject.transition_prefix+selTitle;
            
            $actors.attr('style', easing);
        });
        
        $('#easing').trigger('change.piecewise');
        
        $('#type').bind('change.piecewise', function(e){
            var $selected = $(this).find(':selected'),
                selVal = $selected.val(),
                _chooseActor = function($actor, classname){
                    $currentActor = $actor;
                    $currentActor
                        .removeClass('hidden')
                        .addClass(classname)
                        .siblings('div')
                        .addClass('hidden');
                };
                
            $stage.fadeOut(function(){
                $(this).removeClass('hidden');
                
                clearInterval(animationTimer);
                $ball.removeAttr('class').addClass('state_0');
                $text.removeAttr('class').addClass('state_0');
                switch(selVal){
                    case 'positions':
                        animationStateCounts = 4;
                        _chooseActor($ball, 'bouncing');
                        break;
                    case 'background-color':
                        animationStateCounts = 4;
                        _chooseActor($ball, 'simon');
                        break;
                    case 'zooming':
                        animationStateCounts = 2;
                        _chooseActor($ball, 'zooming');
                        break;
                    case 'letter-spacing':
                        animationStateCounts = 2;
                        _chooseActor($text, 'spacing');
                        break;
                    case 'line-height':
                        animationStateCounts = 2;
                        _chooseActor($text, 'height');
                        break;
                }
                
                $stage.fadeIn(function(){
                    animationTimer = setInterval(_stateChanger, 1000);
                });
            });
            
            
        });
        
        $('#type').trigger('change.piecewise');
    };
    
    /****************************************************
     * init:void                                        *
     *                                                  *
     * Let's get this party started!                    *
     ****************************************************/
     
    pub.init = function(){
        var transition = _setTransition();
        
        _normalizeTransitionEvent(transition);

        _appendElements();
        _binds();
    };
    
    return pub;
    
})(jQuery);